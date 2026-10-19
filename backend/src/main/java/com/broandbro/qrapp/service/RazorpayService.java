package com.broandbro.qrapp.service;

import com.broandbro.qrapp.config.RazorpayProperties;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestTemplate;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class RazorpayService {
    private static final Logger log = LoggerFactory.getLogger(RazorpayService.class);
    private static final String RAZORPAY_API_BASE = "https://api.razorpay.com/v1";

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
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(5));
        requestFactory.setReadTimeout(Duration.ofSeconds(20));
        this.restTemplate = new RestTemplate(requestFactory);
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
        } catch (IllegalStateException e) {
            // Razorpay API returned an error — propagate with full details intact
            log.error("Razorpay API error for receipt={}: {}", receipt, e.getMessage());
            throw e;
        } catch (Exception e) {
            log.error("Failed to create Razorpay order for receipt={}", receipt, e);
            throw new RuntimeException("Failed to create Razorpay order: " + e.getMessage(), e);
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

    /**
     * Refund a captured payment in full. Amount is in paise. {@code refundKey} is stored in the
     * refund's notes so that an ambiguous outcome can be reconciled via {@link #findRefundIdByKey}.
     * Returns the Razorpay refund ID.
     *
     * @throws RefundException with {@code definite=true} when Razorpay definitively rejected the refund
     *                         (nothing was refunded), or {@code definite=false} when the outcome is unknown.
     */
    public String refundPayment(String paymentId, long amountPaise, String refundKey) {
        if (!enabled) {
            throw new RefundException("Razorpay is not configured; cannot refund payment " + paymentId, true, null);
        }
        Map<String, Object> body = new HashMap<>();
        body.put("amount", amountPaise);
        body.put("speed", "normal");
        body.put("notes", Map.of("refund_key", refundKey));

        String url = RAZORPAY_API_BASE + "/payments/" + paymentId + "/refund";
        log.info("[Razorpay] Refunding payment — paymentId={} amountPaise={} refundKey={}", paymentId, amountPaise, refundKey);
        try {
            String payload = objectMapper.writeValueAsString(body);
            ResponseEntity<String> resp = restTemplate.postForEntity(url, new HttpEntity<>(payload, jsonAuthHeaders()), String.class);
            if (!resp.getStatusCode().is2xxSuccessful() || resp.getBody() == null) {
                throw new RefundException("Razorpay refund failed: status=" + resp.getStatusCode().value(), false, null);
            }
            Map<String, Object> map = objectMapper.readValue(resp.getBody(), new TypeReference<>() {});
            Object id = map.get("id");
            if (id == null) {
                throw new RefundException("Razorpay refund response missing id", false, null);
            }
            log.info("[Razorpay] Refund created — refundId={} paymentId={}", id, paymentId);
            return id.toString();
        } catch (RefundException e) {
            throw e;
        } catch (RestClientResponseException ex) {
            int status = ex.getStatusCode().value();
            log.error("[Razorpay] Refund API error — httpStatus={} body={}", status, ex.getResponseBodyAsString());
            // 4xx (except 408/429) means Razorpay rejected the request; nothing was refunded.
            boolean definite = status >= 400 && status < 500 && status != 408 && status != 429;
            throw new RefundException("Razorpay refund failed: status=" + status, definite, ex);
        } catch (Exception e) {
            // Timeouts, connection resets and unparsable responses: the refund may or may not have been created.
            throw new RefundException("Razorpay refund outcome unknown: " + e.getMessage(), false, e);
        }
    }

    /**
     * Looks up a previously created refund by the refund_key stored in its notes.
     * Used to reconcile refunds whose response was lost. Empty when no matching refund exists.
     */
    public Optional<String> findRefundIdByKey(String paymentId, String refundKey) {
        if (!enabled) {
            throw new IllegalStateException("Razorpay is not configured; cannot look up refunds for " + paymentId);
        }
        String url = RAZORPAY_API_BASE + "/payments/" + paymentId + "/refunds?count=100";
        try {
            ResponseEntity<String> resp = restTemplate.exchange(url, HttpMethod.GET,
                    new HttpEntity<>(jsonAuthHeaders()), String.class);
            if (!resp.getStatusCode().is2xxSuccessful() || resp.getBody() == null) {
                throw new IllegalStateException("Razorpay refund lookup failed: status=" + resp.getStatusCode().value());
            }
            Map<String, Object> map = objectMapper.readValue(resp.getBody(), new TypeReference<>() {});
            Object items = map.get("items");
            if (items instanceof List<?> list) {
                for (Object item : list) {
                    if (item instanceof Map<?, ?> refund && refund.get("notes") instanceof Map<?, ?> notes
                            && refundKey.equals(notes.get("refund_key")) && refund.get("id") != null
                            && !"failed".equals(refund.get("status"))) {
                        return Optional.of(refund.get("id").toString());
                    }
                }
            }
            return Optional.empty();
        } catch (RestClientResponseException ex) {
            throw new IllegalStateException("Razorpay refund lookup failed: status=" + ex.getStatusCode().value(), ex);
        } catch (IllegalStateException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalStateException("Razorpay refund lookup failed: " + e.getMessage(), e);
        }
    }

    private HttpHeaders jsonAuthHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBasicAuth(keyId, keySecret);
        return headers;
    }

    /** Refund failure. {@code definite} means Razorpay did not refund the money, so a retry is safe. */
    public static class RefundException extends RuntimeException {
        private final boolean definite;

        public RefundException(String message, boolean definite, Throwable cause) {
            super(message, cause);
            this.definite = definite;
        }

        public boolean isDefinite() {
            return definite;
        }
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

        log.info("[Razorpay] Creating order — amount={} paise currency={} receipt={}", amount, currency, receipt);

        ResponseEntity<String> resp;
        try {
            resp = restTemplate.postForEntity(ordersApiUrl, entity, String.class);
        } catch (RestClientResponseException ex) {
            String responseBody = ex.getResponseBodyAsString();
            log.error("[Razorpay] API error — httpStatus={} body={}", ex.getStatusCode().value(), responseBody);
            throw new IllegalStateException("Razorpay order creation failed: status=" + ex.getStatusCode().value()
                    + (StringUtils.hasText(responseBody) ? " body=" + responseBody : ""), ex);
        }

        log.info("[Razorpay] HTTP response status={}", resp.getStatusCode().value());

        if (!resp.getStatusCode().is2xxSuccessful()) {
            log.error("[Razorpay] Non-2xx response — status={} body={}", resp.getStatusCode().value(), resp.getBody());
            throw new RuntimeException("Failed to create order: status=" + resp.getStatusCode().value());
        }

        Map<String, Object> map = objectMapper.readValue(resp.getBody(), new TypeReference<>() {});
        Object id = map.get("id");
        if (id == null) {
            log.error("[Razorpay] Response missing 'id' field — body={}", resp.getBody());
            throw new RuntimeException("Razorpay response missing id");
        }

        log.info("[Razorpay] Order created successfully — rzpOrderId={}", id);
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
