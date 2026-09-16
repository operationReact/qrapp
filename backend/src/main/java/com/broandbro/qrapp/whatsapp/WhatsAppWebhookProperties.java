package com.broandbro.qrapp.whatsapp;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "whatsapp.webhook")
public record WhatsAppWebhookProperties(
        String verifyToken,
        String appSecret
) {
}
