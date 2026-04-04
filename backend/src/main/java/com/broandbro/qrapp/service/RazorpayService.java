package com.broandbro.qrapp.service;

import com.broandbro.qrapp.config.RazorpayProperties;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestTemplate;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

@Service
public class RazorpayService {
    private static final Logger log = LoggerFactory.getLogger(RazorpayService.class);

    private final String keyId;
    private final String keySecret;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final boolean enabled;

    public RazorpayService(RazorpayProperties razorpayProperties, Environment environment) {
        String configuredKey = razorpayProperties.getKey();
        String configuredSecret = razorpayProperties.getSecret();
        this.keyId = configuredKey == null ? "" : configuredKey.trim();
        this.keySecret = configuredSecret == null ? "" : configuredSecret.trim();
        this.enabled = isUsableCredential(this.keyId) && isUsableCredential(this.keySecret);
        this.restTemplate = new RestTemplate();
        this.objectMapper = new ObjectMapper();

        String[] activeProfiles = environment.getActiveProfiles();
        String profileSummary = activeProfiles.length == 0 ? "(default)" : String.join(",", activeProfiles);
        log.info("RazorpayService initialized. activeProfiles={} key={} secretSet={} enabled={}",
                profileSummary,
                maskKey(this.keyId),
                StringUtils.hasText(this.keySecret),
                this.enabled);
    }

    /**
     * Create a Razorpay order via REST API. Amount must be in the smallest currency unit (paise).
     */
    public String createOrder(Long amount, String currency, String receipt) {
        validateCreateOrderRequest(amount, currency, receipt);
        if (!enabled) {
            throw new IllegalStateException("Razorpay is not configured. Set razorpay.key and razorpay.secret to enable payments.");
        }
        try {
            return createLiveOrder(amount, currency, receipt);
        } catch (Exception e) {
            log.error("Failed to create Razorpay order for receipt={}", receipt, e);
            throw new RuntimeException("Failed to create Razorpay order", e);
        }
    }

    /**
     * Verify HMAC-SHA256 signature returned by Razorpay for an order+payment pair.
     * Razorpay signs payload: order_id + "|" + payment_id using keySecret.
     */
    public boolean verifySignature(String orderId, String paymentId, String signature) {
        if (!enabled || !StringUtils.hasText(orderId) || !StringUtils.hasText(paymentId) || !StringUtils.hasText(signature)) {
            return false;
        }
        try {
            String payload = orderId.trim() + "|" + paymentId.trim();
            byte[] hmac = hmacSha256(payload.getBytes(StandardCharsets.UTF_8), keySecret.getBytes(StandardCharsets.UTF_8));
            String computed = bytesToHex(hmac);
            // Razorpay signature is hex string (lowercase), compare case-insensitive just in case
            return computed.equalsIgnoreCase(signature.trim());
        } catch (Exception e) {
            log.warn("Failed to verify Razorpay signature for orderId={} paymentId={}", orderId, paymentId, e);
            return false;
        }
    }

    public String getKeyId() {
        return keyId;
    }

    public boolean isEnabled() {
        return enabled;
    }

    protected String createLiveOrder(Long amount, String currency, String receipt) throws Exception {
        Map<String, Object> body = new HashMap<>();
        body.put("amount", amount);
        body.put("currency", currency.trim().toUpperCase());
        body.put("receipt", receipt.trim());
        body.put("payment_capture", 1);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBasicAuth(keyId, keySecret);

        String payload = objectMapper.writeValueAsString(body);
        HttpEntity<String> entity = new HttpEntity<>(payload, headers);
        String ordersApiUrl = "https://api.razorpay.com/v1/orders";

        ResponseEntity<String> resp;
        try {
            resp = restTemplate.postForEntity(ordersApiUrl, entity, String.class);
        } catch (RestClientResponseException ex) {
            String responseBody = ex.getResponseBodyAsString();
            throw new IllegalStateException("Razorpay order creation failed: status=" + ex.getStatusCode().value()
                    + (StringUtils.hasText(responseBody) ? " body=" + responseBody : ""), ex);
        }
        if (!resp.getStatusCode().is2xxSuccessful()) {
            throw new RuntimeException("Failed to create order: status=" + resp.getStatusCode().value());
        }

        Map<String, Object> map = objectMapper.readValue(resp.getBody(), new TypeReference<>() {});
        Object id = map.get("id");
        if (id == null) {
            throw new RuntimeException("Razorpay response missing id");
        }
        return id.toString();
    }

    private boolean isUsableCredential(String value) {
        if (value == null) {
            return false;
        }
        String normalized = value.trim();
        if (normalized.isEmpty()) {
            return false;
        }
        return !normalized.equalsIgnoreCase("YOUR_KEY")
                && !normalized.equalsIgnoreCase("YOUR_SECRET")
                && !normalized.startsWith("YOUR_");
    }

    private void validateCreateOrderRequest(Long amount, String currency, String receipt) {
        if (amount == null || amount <= 0) {
            throw new IllegalArgumentException("Amount must be greater than zero");
        }
        if (!StringUtils.hasText(currency)) {
            throw new IllegalArgumentException("Currency is required");
        }
        if (!StringUtils.hasText(receipt)) {
            throw new IllegalArgumentException("Receipt is required");
        }
    }

    private String maskKey(String value) {
        if (!StringUtils.hasText(value)) {
            return "<not-set>";
        }
        String trimmed = value.trim();
        return trimmed.length() <= 8 ? trimmed : trimmed.substring(0, 6) + "..." + trimmed.substring(trimmed.length() - 2);
    }


    private static byte[] hmacSha256(byte[] data, byte[] key) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        SecretKeySpec secretKeySpec = new SecretKeySpec(key, "HmacSHA256");
        mac.init(secretKeySpec);
        return mac.doFinal(data);
    }

    private static String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) {
            sb.append(String.format("%02x", b & 0xff));
        }
        return sb.toString();
    }
}
