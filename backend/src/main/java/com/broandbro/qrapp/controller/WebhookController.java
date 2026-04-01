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

        // If a webhook secret is configured, verify signature
        if (webhookSecret != null && !webhookSecret.isBlank()) {
            if (signature == null || signature.isBlank()) {
                log.warn("Missing webhook signature");
                return ResponseEntity.badRequest().build();
            }

            try {
                String computed = computeHmacSHA256(payload, webhookSecret);
                if (!computed.equals(signature)) {
                    log.warn("Invalid webhook signature");
                    return ResponseEntity.status(401).build();
                }
            } catch (Exception e) {
                log.error("Error verifying webhook signature", e);
                return ResponseEntity.status(500).build();
            }
        }

        // Best-effort parse to extract razorpay_order_id using regex
        String razorpayOrderId = extractRazorpayOrderId(payload);
        if (razorpayOrderId == null) {
            log.warn("Could not extract razorpay_order_id from payload");
            return ResponseEntity.badRequest().build();
        }

        orderService.markOrderPaidByRazorpayOrderId(razorpayOrderId);

        return ResponseEntity.ok().build();
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