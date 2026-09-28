package com.broandbro.qrapp.controller;

import com.broandbro.qrapp.service.OrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.nio.charset.StandardCharsets;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.util.Base64;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/webhook")
@RequiredArgsConstructor
public class WebhookController {

    private static final Logger log = LoggerFactory.getLogger(WebhookController.class);

    private final OrderService orderService;

    @Value("${razorpay.webhook.secret:}")
    private String webhookSecret;

    private static final Pattern RAZORPAY_ORDER_ID_PATTERN = Pattern.compile("\"razorpay_order_id\"\s*:\s*\"([^\"]+)\"");

    @PostMapping("/razorpay")
    public ResponseEntity<?> handleWebhook(@RequestBody String payload,
                                           @RequestHeader(value = "X-Razorpay-Signature", required = false) String signature) {

        log.info("[Webhook] ========== WEBHOOK RECEIVED ==========");
        log.info("[Webhook] Payload length: {} bytes", payload.length());
        log.info("[Webhook] Payload: {}", payload);
        log.info("[Webhook] Signature header present: {}", (signature != null && !signature.isBlank()));
        log.info("[Webhook] Webhook secret configured: {}", (webhookSecret != null && !webhookSecret.isBlank()));
        
        if (webhookSecret != null && !webhookSecret.isBlank()) {
            log.info("[Webhook] Signature verification ENABLED");
            if (signature == null || signature.isBlank()) {
                log.error("[Webhook] REJECTED: Missing webhook signature");
                log.error("[Webhook] ← RESPONSE: 400 Bad Request (missing signature)");
                return ResponseEntity.badRequest().build();
            }

            try {
                String computed = computeHmacSHA256(payload, webhookSecret);
                log.info("[Webhook] Computed signature: {}", computed);
                log.info("[Webhook] Received signature: {}", signature);
                if (!computed.equals(signature)) {
                    log.error("[Webhook] REJECTED: Invalid webhook signature");
                    log.error("[Webhook] ← RESPONSE: 401 Unauthorized (signature mismatch)");
                    return ResponseEntity.status(401).build();
                }
                log.info("[Webhook] ✓ Signature verified successfully");
            } catch (Exception e) {
                log.error("[Webhook] REJECTED: Error verifying webhook signature", e);
                log.error("[Webhook] ← RESPONSE: 500 Internal Server Error (signature verification failed)");
                return ResponseEntity.status(500).build();
            }
        } else {
            log.warn("[Webhook] ⚠ No webhook secret configured - signature verification SKIPPED");
        }

        // Best-effort parse to extract razorpay_order_id using regex
        log.info("[Webhook] Attempting to extract razorpay_order_id from payload...");
        String razorpayOrderId = extractRazorpayOrderId(payload);
        if (razorpayOrderId == null) {
            log.error("[Webhook] REJECTED: Could not extract razorpay_order_id from payload");
            log.error("[Webhook] Payload was: {}", payload);
            log.error("[Webhook] ← RESPONSE: 400 Bad Request (razorpay_order_id not found in payload)");
            return ResponseEntity.badRequest().build();
        }

        log.info("[Webhook] ✓ Extracted razorpay_order_id: {}", razorpayOrderId);
        
        try {
            log.info("[Webhook] Calling orderService.markOrderPaidByRazorpayOrderId({})", razorpayOrderId);
            orderService.markOrderPaidByRazorpayOrderId(razorpayOrderId);
            log.info("[Webhook] ✓ Order marked as PAID for razorpay_order_id: {}", razorpayOrderId);
            log.info("[Webhook] ========== WEBHOOK PROCESSED SUCCESSFULLY ==========");
            log.info("[Webhook] ← RESPONSE: 200 OK (order payment confirmed)");
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException e) {
            log.error("[Webhook] REJECTED: Order not found for razorpayOrderId: {}", razorpayOrderId);
            log.error("[Webhook] Exception: {}", e.getMessage());
            log.error("[Webhook] ← RESPONSE: 404 Not Found (order does not exist)");
            return ResponseEntity.status(404).build();
        } catch (Exception e) {
            log.error("[Webhook] ERROR: Exception while marking order as PAID for razorpay_order_id: {}", razorpayOrderId);
            log.error("[Webhook] Exception type: {}", e.getClass().getName());
            log.error("[Webhook] Exception message: {}", e.getMessage());
            log.error("[Webhook] Exception details:", e);
            log.error("[Webhook] ← RESPONSE: 500 Internal Server Error (database/service error)");
            return ResponseEntity.status(500).build();
        }
    }

    private String computeHmacSHA256(String data, String secretKey) throws Exception {
        Mac sha256_HMAC = Mac.getInstance("HmacSHA256");
        SecretKeySpec secret_key = new SecretKeySpec(secretKey.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        sha256_HMAC.init(secret_key);
        byte[] hash = sha256_HMAC.doFinal(data.getBytes(StandardCharsets.UTF_8));
        return Base64.getEncoder().encodeToString(hash);
    }

    private String extractRazorpayOrderId(String payload) {
        Matcher m = RAZORPAY_ORDER_ID_PATTERN.matcher(payload);
        if (m.find()) {
            return m.group(1);
        }
        return null;
    }
}