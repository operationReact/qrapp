package com.broandbro.qrapp.controller;

import com.broandbro.qrapp.whatsapp.WhatsAppWebhookProcessingException;
import com.broandbro.qrapp.whatsapp.WhatsAppWebhookProperties;
import com.broandbro.qrapp.whatsapp.WhatsAppWebhookService;
import com.broandbro.qrapp.whatsapp.WhatsAppWebhookSignatureValidator;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

@RestController
@RequestMapping("/webhooks/whatsapp")
@Slf4j
public class WhatsAppWebhookController {

    private final WhatsAppWebhookProperties properties;
    private final WhatsAppWebhookSignatureValidator signatureValidator;
    private final WhatsAppWebhookService webhookService;

    public WhatsAppWebhookController(
            WhatsAppWebhookProperties properties,
            WhatsAppWebhookSignatureValidator signatureValidator,
            WhatsAppWebhookService webhookService
    ) {
        this.properties = properties;
        this.signatureValidator = signatureValidator;
        this.webhookService = webhookService;
    }

    @GetMapping
    public ResponseEntity<String> verify(
            @RequestParam(name = "hub.mode", required = false) String mode,
            @RequestParam(name = "hub.challenge", required = false) String challenge,
            @RequestParam(name = "hub.verify_token", required = false) String verifyToken
    ) {
        if (!"subscribe".equals(mode)
                || !StringUtils.hasText(challenge)
                || !StringUtils.hasText(properties.verifyToken())
                || !StringUtils.hasText(verifyToken)
                || !constantTimeEquals(properties.verifyToken(), verifyToken)) {
            log.warn("WhatsApp webhook verification rejected");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        log.info("WhatsApp webhook verification accepted");
        return ResponseEntity.ok(challenge);
    }

    @PostMapping(consumes = "application/json")
    public ResponseEntity<Void> receive(
            @RequestBody(required = false) byte[] rawBody,
            @RequestHeader(name = "X-Hub-Signature-256", required = false) String signature
    ) {
        if (!signatureValidator.isValid(rawBody, signature)) {
            log.warn("WhatsApp webhook signature rejected");
            return ResponseEntity.badRequest().build();
        }

        try {
            webhookService.accept(rawBody);
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException ex) {
            log.warn("WhatsApp webhook request rejected: {}", ex.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (WhatsAppWebhookProcessingException ex) {
            log.error("WhatsApp webhook publication failed", ex);
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).build();
        }
    }

    private boolean constantTimeEquals(String expected, String actual) {
        return MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8),
                actual.getBytes(StandardCharsets.UTF_8)
        );
    }
}
