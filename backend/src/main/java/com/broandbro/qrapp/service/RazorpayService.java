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
import org.springframework.web.client.RestTemplate;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class RazorpayService {
    private static final Logger log = LoggerFactory.getLogger(RazorpayService.class);

    private final String keyId;
    private final String keySecret;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final boolean enabled;
    private final boolean nonProductionEnvironment;
    private final boolean mockModeEnabled;

    public RazorpayService(RazorpayProperties razorpayProperties, Environment environment) {
        String configuredKey = razorpayProperties.getKey();
        String configuredSecret = razorpayProperties.getSecret();
        this.keyId = configuredKey == null ? "" : configuredKey.trim();
        this.keySecret = configuredSecret == null ? "" : configuredSecret.trim();
        this.enabled = isUsableCredential(this.keyId) && isUsableCredential(this.keySecret);
        this.nonProductionEnvironment = Arrays.stream(environment.getActiveProfiles())
                .noneMatch(profile -> "prod".equalsIgnoreCase(profile) || "production".equalsIgnoreCase(profile));
        this.mockModeEnabled = !enabled && nonProductionEnvironment;
        this.restTemplate = new RestTemplate();
        this.objectMapper = new ObjectMapper();
    }

    /**
     * Create a Razorpay order via REST API. Amount must be in the smallest currency unit (paise).
     */
    public String createOrder(Long amount, String currency, String receipt) {
        if (!enabled) {
            if (mockModeEnabled) {
                return generateMockOrderId();
            }
            throw new IllegalStateException("Razorpay is not configured. Set razorpay.key and razorpay.secret to enable payments.");
        }
        try {
            return createLiveOrder(amount, currency, receipt);
        } catch (Exception e) {
            if (isNonProductionFallbackAllowed()) {
                log.warn("Falling back to mock Razorpay order in non-production mode: {}", e.getMessage());
                return generateMockOrderId();
            }
            throw new RuntimeException("Failed to create Razorpay order", e);
        }
    }

    /**
     * Verify HMAC-SHA256 signature returned by Razorpay for an order+payment pair.
     * Razorpay signs payload: order_id + "|" + payment_id using keySecret.
     */
    public boolean verifySignature(String orderId, String paymentId, String signature) {
        if (!enabled) {
            return mockModeEnabled
                    && orderId != null && orderId.startsWith("mock_rzp_")
                    && paymentId != null && paymentId.startsWith("mock_pay_")
                    && "mock_signature".equals(signature);
        }
        try {
            String payload = orderId + "|" + paymentId;
            byte[] hmac = hmacSha256(payload.getBytes(StandardCharsets.UTF_8), keySecret.getBytes(StandardCharsets.UTF_8));
            String computed = bytesToHex(hmac);
            // Razorpay signature is hex string (lowercase), compare case-insensitive just in case
            return computed.equalsIgnoreCase(signature);
        } catch (Exception e) {
            return false;
        }
    }

    public String getKeyId() {
        return keyId;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public boolean isMockModeEnabled() {
        return mockModeEnabled;
    }

    public boolean isMockOrderId(String orderId) {
        return orderId != null && orderId.startsWith("mock_rzp_");
    }

    protected String createLiveOrder(Long amount, String currency, String receipt) throws Exception {
        Map<String, Object> body = new HashMap<>();
        body.put("amount", amount);
        body.put("currency", currency);
        body.put("receipt", receipt);
        body.put("payment_capture", 1);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBasicAuth(keyId, keySecret);

        String payload = objectMapper.writeValueAsString(body);
        HttpEntity<String> entity = new HttpEntity<>(payload, headers);
        String ordersApiUrl = "https://api.razorpay.com/v1/orders";

        ResponseEntity<String> resp = restTemplate.postForEntity(ordersApiUrl, entity, String.class);
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

    private boolean isNonProductionFallbackAllowed() {
        return nonProductionEnvironment;
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

    private String generateMockOrderId() {
        return "mock_rzp_" + UUID.randomUUID();
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
