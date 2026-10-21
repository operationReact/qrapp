package com.broandbro.qrapp.controller;

import com.broandbro.qrapp.config.RazorpayProperties;
import com.broandbro.qrapp.service.RazorpayWebhookService;
import com.broandbro.qrapp.service.RefundService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;

@RestController
@RequestMapping("/webhook")
@RequiredArgsConstructor
@Slf4j
public class WebhookController {

    private final RazorpayProperties razorpayProperties;
    private final RazorpayWebhookService webhookService;
    private final ObjectMapper objectMapper;

    @PostMapping("/razorpay")
    public ResponseEntity<Void> handleWebhook(
            @RequestBody byte[] rawRequestBody,
            @RequestHeader(value = "X-Razorpay-Signature", required = false) String signature) {
        boolean signaturePresent = StringUtils.hasText(signature);
        log.info("[Webhook] signaturePresent={} bodyLength={}", signaturePresent, rawRequestBody.length);

        String webhookSecret = razorpayProperties.getWebhookSecret();
        if (!StringUtils.hasText(webhookSecret)) {
            log.error("[Webhook] Razorpay webhook secret is not configured; refusing unsigned processing");
            log.info("[Webhook] response=503");
            return ResponseEntity.status(503).build();
        }
        if (!signaturePresent) {
            log.warn("[Webhook] signatureValid=false reason=missing");
            log.info("[Webhook] response=401");
            return ResponseEntity.status(401).build();
        }
        if (!isValidSignature(rawRequestBody, signature, webhookSecret)) {
            log.warn("[Webhook] signatureValid=false reason=mismatch");
            log.info("[Webhook] response=401");
            return ResponseEntity.status(401).build();
        }
        log.info("[Webhook] signatureValid=true");

        JsonNode root;
        try {
            root = objectMapper.readTree(rawRequestBody);
        } catch (Exception e) {
            log.warn("[Webhook] malformed JSON: {}", e.getMessage());
            log.info("[Webhook] response=400");
            return ResponseEntity.badRequest().build();
        }
        if (root == null || !root.isObject() || !root.path("event").isTextual()) {
            log.warn("[Webhook] malformed JSON: missing root event");
            log.info("[Webhook] response=400");
            return ResponseEntity.badRequest().build();
        }

        String event = root.path("event").asText();
        String razorpayEventId = textAt(root, "id");
        String razorpayPaymentId = textAt(root, "payload", "payment", "entity", "id");
        String razorpayOrderId = extractOrderId(event, root);
        log.info("[Webhook] event={} razorpayPaymentId={} razorpayOrderId={}",
                event, valueOrNone(razorpayPaymentId), valueOrNone(razorpayOrderId));

        try {
            if (event.startsWith("refund.")) {
                RefundService.ProviderRefundUpdate update = refundUpdateFrom(event, root);
                log.info("[Webhook] refund event={} providerRefundId={} paymentId={} refundKeyPresent={}",
                        event, valueOrNone(update.providerRefundId()), valueOrNone(update.paymentId()),
                        update.refundKey() != null);
                RazorpayWebhookService.ProcessingResult result =
                        webhookService.processRefundEvent(razorpayEventId, event, update);
                log.info("[Webhook] processing={} response=200", result);
                return ResponseEntity.ok().build();
            }
            RazorpayWebhookService.ProcessingResult result =
                    webhookService.process(razorpayEventId, event, razorpayPaymentId, razorpayOrderId);
            log.info("[Webhook] processing={} response=200", result);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            log.error("[Webhook] processing failed event={} razorpayOrderId={}", event, razorpayOrderId, e);
            log.info("[Webhook] response=503");
            return ResponseEntity.status(503).build();
        }
    }

    private RefundService.ProviderRefundUpdate refundUpdateFrom(String event, JsonNode root) {
        String providerRefundId = textAt(root, "payload", "refund", "entity", "id");
        String paymentId = textAt(root, "payload", "refund", "entity", "payment_id");
        String refundKey = textAt(root, "payload", "refund", "entity", "notes", "refund_key");
        JsonNode amount = root.at("/payload/refund/entity/amount");
        Long amountPaise = amount.isIntegralNumber() ? amount.asLong() : null;
        String speedRequested = textAt(root, "payload", "refund", "entity", "speed_requested");
        String speedProcessed = textAt(root, "payload", "refund", "entity", "speed_processed");
        String arn = textAt(root, "payload", "refund", "entity", "acquirer_data", "arn");
        String paymentMethod = textAt(root, "payload", "payment", "entity", "method");
        String paymentVpa = textAt(root, "payload", "payment", "entity", "vpa");
        String paymentBank = textAt(root, "payload", "payment", "entity", "bank");
        String paymentCardLast4 = textAt(root, "payload", "payment", "entity", "card", "last4");
        JsonNode paymentAmount = root.at("/payload/payment/entity/amount");
        Long paymentAmountPaise = paymentAmount.isIntegralNumber() ? paymentAmount.asLong() : null;
        return new RefundService.ProviderRefundUpdate(event, providerRefundId, refundKey, paymentId, amountPaise,
                speedRequested, speedProcessed, arn, paymentMethod, paymentVpa, paymentBank, paymentCardLast4,
                paymentAmountPaise);
    }

    private String extractOrderId(String event, JsonNode root) {
        if ("order.paid".equals(event)) {
            String orderId = textAt(root, "payload", "order", "entity", "id");
            return StringUtils.hasText(orderId)
                    ? orderId
                    : textAt(root, "payload", "payment", "entity", "order_id");
        }
        if (event.startsWith("payment.")) {
            return textAt(root, "payload", "payment", "entity", "order_id");
        }
        return null;
    }

    private String textAt(JsonNode node, String... path) {
        JsonNode current = node;
        for (String segment : path) {
            current = current == null ? null : current.get(segment);
        }
        return current != null && current.isTextual() && StringUtils.hasText(current.asText())
                ? current.asText()
                : null;
    }

    static boolean isValidSignature(byte[] rawRequestBody, String signature, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            String computed = HexFormat.of().formatHex(mac.doFinal(rawRequestBody));
            return MessageDigest.isEqual(
                    computed.getBytes(StandardCharsets.US_ASCII),
                    signature.trim().getBytes(StandardCharsets.US_ASCII));
        } catch (Exception e) {
            return false;
        }
    }

    private String valueOrNone(String value) {
        return value == null ? "<none>" : value;
    }
}
