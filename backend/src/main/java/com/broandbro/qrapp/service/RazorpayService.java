package com.broandbro.qrapp.service;

import com.broandbro.qrapp.config.RazorpayProperties;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class RazorpayService {
    private static final Logger log = LoggerFactory.getLogger(RazorpayService.class);
    private static final String RAZORPAY_API_BASE = "https://api.razorpay.com/v1";
    /** Razorpay's normal-refund idempotency header; the key is persisted per refund row. */
    static final String REFUND_IDEMPOTENCY_HEADER = "X-Refund-Idempotency";
    static final int REFUND_LOOKUP_PAGE_SIZE = 100;
    /** Upper bound on refund-list pages scanned during reconciliation (2,000 refunds per payment). */
    static final int REFUND_LOOKUP_MAX_PAGES = 20;

    private final String keyId;
    private final String keySecret;
    private final RestTemplate restTemplate;
    private final String apiBase;
    private final ObjectMapper objectMapper;
    private final boolean enabled;

    @Autowired
    public RazorpayService(RazorpayProperties razorpayProperties, Environment environment) {
        this(razorpayProperties, environment, defaultRestTemplate(), RAZORPAY_API_BASE);
    }

    RazorpayService(RazorpayProperties razorpayProperties, Environment environment,
                    RestTemplate restTemplate, String apiBase) {
        String configuredKey = razorpayProperties.getKey();
        String configuredSecret = razorpayProperties.getSecret();
        this.keyId = configuredKey == null ? "" : configuredKey.trim();
        this.keySecret = configuredSecret == null ? "" : configuredSecret.trim();
        this.enabled = isUsableCredential(this.keyId) && isUsableCredential(this.keySecret);
        this.restTemplate = restTemplate;
        this.apiBase = apiBase;
        this.objectMapper = new ObjectMapper();

        String[] activeProfiles = environment.getActiveProfiles();
        String profileSummary = activeProfiles.length == 0 ? "(default)" : String.join(",", activeProfiles);
        log.info("RazorpayService initialized. activeProfiles={} key={} secretSet={} enabled={}",
                profileSummary,
                maskKey(this.keyId),
                StringUtils.hasText(this.keySecret),
                this.enabled);
    }

    private static RestTemplate defaultRestTemplate() {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(5));
        requestFactory.setReadTimeout(Duration.ofSeconds(20));
        return new RestTemplate(requestFactory);
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
        // Razorpay requires the retried body to match the original, so the body is built deterministically.
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("amount", amountPaise);
        body.put("speed", "normal");
        body.put("notes", Map.of("refund_key", refundKey));

        String url = apiBase + "/payments/" + paymentId + "/refund";
        log.info("[Razorpay] Refunding payment — paymentId={} amountPaise={} refundKey={}", paymentId, amountPaise, refundKey);
        try {
            String payload = objectMapper.writeValueAsString(body);
            HttpHeaders headers = jsonAuthHeaders();
            headers.set(REFUND_IDEMPOTENCY_HEADER, refundKey);
            ResponseEntity<String> resp = restTemplate.postForEntity(url, new HttpEntity<>(payload, headers), String.class);
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
            // 4xx (except 408/409/429) means Razorpay rejected the request; nothing was refunded.
            // 409 means the same idempotency key is still in progress or was already used, so the outcome is not known.
            // The docs also show "already processed" for a reused key as a 400, so idempotency errors stay ambiguous.
            boolean definite = status >= 400 && status < 500
                    && status != 408 && status != 409 && status != 429
                    && !isIdempotencyError(ex.getResponseBodyAsString());
            throw new RefundException("Razorpay refund failed: status=" + status, definite, ex);
        } catch (Exception e) {
            // Timeouts, connection resets and unparsable responses: the refund may or may not have been created.
            throw new RefundException("Razorpay refund outcome unknown: " + e.getMessage(), false, e);
        }
    }

    /**
     * Looks up a previously created refund by the refund_key stored in its notes.
     * Used to reconcile refunds whose response was lost. Empty only when every page was read and none matched.
     * Pages are read until an empty page, because a short page could be a server-side cap. Any page failure,
     * a malformed response, or exceeding the page cap throws, so the caller treats the outcome as unresolved.
     */
    public Optional<ProviderRefund> findRefundByKey(String paymentId, String refundKey) {
        if (!enabled) {
            throw new IllegalStateException("Razorpay is not configured; cannot look up refunds for " + paymentId);
        }
        long skip = 0;
        for (int page = 0; page < REFUND_LOOKUP_MAX_PAGES; page++) {
            List<?> items = fetchRefundPage(paymentId, skip);
            if (items.isEmpty()) {
                return Optional.empty();
            }
            Optional<ProviderRefund> match = matchRefundInPage(items, refundKey);
            if (match.isPresent()) {
                return match;
            }
            skip += items.size();
        }
        throw new IllegalStateException("Razorpay refund lookup incomplete for payment " + paymentId
                + ": more than " + (REFUND_LOOKUP_MAX_PAGES * REFUND_LOOKUP_PAGE_SIZE) + " refunds");
    }

    /** A refund found on Razorpay by its refund_key. {@code status} is Razorpay's value: pending, processed or failed. */
    public record ProviderRefund(String id, String status) {}

    /** Returns the refund id unless Razorpay reports it as failed. */
    public Optional<String> findRefundIdByKey(String paymentId, String refundKey) {
        return findRefundByKey(paymentId, refundKey)
                .filter(refund -> !"failed".equals(refund.status()))
                .map(ProviderRefund::id);
    }

    /** A single refund as Razorpay reports it. {@code refundKey} is the notes.refund_key stored at creation, if any. */
    public record RefundDetail(String id, String paymentId, long amountPaise, String status, String refundKey) {}

    /**
     * Fetches one refund by id ({@code GET /payments/{payment_id}/refunds/{refund_id}}).
     * Any failure throws a non-definite {@link RefundException}: a fetch error never proves a refund was rejected.
     */
    public RefundDetail fetchRefund(String paymentId, String refundId) {
        if (!enabled) {
            throw new RefundException("Razorpay is not configured; cannot fetch refund " + refundId, false, null);
        }
        String url = apiBase + "/payments/" + paymentId + "/refunds/" + refundId;
        try {
            ResponseEntity<String> resp = restTemplate.exchange(url, HttpMethod.GET,
                    new HttpEntity<>(jsonAuthHeaders()), String.class);
            if (!resp.getStatusCode().is2xxSuccessful() || resp.getBody() == null) {
                throw new RefundException("Razorpay refund fetch failed: status=" + resp.getStatusCode().value(), false, null);
            }
            Map<String, Object> map = objectMapper.readValue(resp.getBody(), new TypeReference<>() {});
            if (map.get("id") == null || map.get("payment_id") == null
                    || !(map.get("amount") instanceof Number amount) || map.get("status") == null) {
                throw new RefundException("Razorpay refund response is missing required fields", false, null);
            }
            String refundKey = map.get("notes") instanceof Map<?, ?> notes && notes.get("refund_key") != null
                    ? notes.get("refund_key").toString() : null;
            return new RefundDetail(map.get("id").toString(), map.get("payment_id").toString(),
                    amount.longValue(), map.get("status").toString(), refundKey);
        } catch (RefundException e) {
            throw e;
        } catch (RestClientResponseException ex) {
            throw new RefundException("Razorpay refund fetch failed: status=" + ex.getStatusCode().value(), false, ex);
        } catch (Exception e) {
            throw new RefundException("Razorpay refund fetch failed: " + e.getMessage(), false, e);
        }
    }

    private static boolean isIdempotencyError(String responseBody) {
        return responseBody != null && responseBody.toLowerCase(java.util.Locale.ROOT).contains("idempotency");
    }

    private List<?> fetchRefundPage(String paymentId, long skip) {
        String url = apiBase + "/payments/" + paymentId + "/refunds?count=" + REFUND_LOOKUP_PAGE_SIZE + "&skip=" + skip;
        try {
            ResponseEntity<String> resp = restTemplate.exchange(url, HttpMethod.GET,
                    new HttpEntity<>(jsonAuthHeaders()), String.class);
            if (!resp.getStatusCode().is2xxSuccessful() || resp.getBody() == null) {
                throw new IllegalStateException("Razorpay refund lookup failed: status=" + resp.getStatusCode().value());
            }
            Map<String, Object> map = objectMapper.readValue(resp.getBody(), new TypeReference<>() {});
            if (!(map.get("items") instanceof List<?> items)) {
                throw new IllegalStateException("Razorpay refund lookup returned no items list");
            }
            return items;
        } catch (RestClientResponseException ex) {
            throw new IllegalStateException("Razorpay refund lookup failed: status=" + ex.getStatusCode().value(), ex);
        } catch (IllegalStateException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalStateException("Razorpay refund lookup failed: " + e.getMessage(), e);
        }
    }

    private static Optional<ProviderRefund> matchRefundInPage(List<?> items, String refundKey) {
        for (Object item : items) {
            if (item instanceof Map<?, ?> refund && refund.get("notes") instanceof Map<?, ?> notes
                    && refundKey.equals(notes.get("refund_key")) && refund.get("id") != null) {
                return Optional.of(new ProviderRefund(refund.get("id").toString(), String.valueOf(refund.get("status"))));
            }
        }
        return Optional.empty();
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
