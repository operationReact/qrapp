package com.broandbro.qrapp.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

@Service
public class RazorpayService {
    private final String keyId;
    private final String keySecret;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final boolean enabled;

    // Provide empty defaults to avoid application startup failure when env vars are not set
    public RazorpayService(@Value("${razorpay.key-id:}") String keyId,
                          @Value("${razorpay.key-secret:}") String keySecret) {
        this.keyId = keyId == null ? "" : keyId.trim();
        this.keySecret = keySecret == null ? "" : keySecret.trim();
        this.enabled = !(this.keyId.isEmpty() || this.keySecret.isEmpty());
        this.restTemplate = new RestTemplate();
        this.objectMapper = new ObjectMapper();
    }

    /**
     * Create a Razorpay order via REST API. Amount must be in the smallest currency unit (paise).
     */
    public String createOrder(Long amount, String currency, String receipt) {
        if (!enabled) {
            throw new IllegalStateException("Razorpay is not configured. Set razorpay.key-id and razorpay.key-secret to enable payments.");
        }
        try {
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
            if (id == null) throw new RuntimeException("Razorpay response missing id");
            return id.toString();
        } catch (Exception e) {
            throw new RuntimeException("Failed to create Razorpay order", e);
        }
    }

    /**
     * Verify HMAC-SHA256 signature returned by Razorpay for an order+payment pair.
     * Razorpay signs payload: order_id + "|" + payment_id using keySecret.
     */
    public boolean verifySignature(String orderId, String paymentId, String signature) {
        if (!enabled) return false;
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
