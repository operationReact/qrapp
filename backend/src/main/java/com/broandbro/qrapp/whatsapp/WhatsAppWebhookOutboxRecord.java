package com.broandbro.qrapp.whatsapp;

public record WhatsAppWebhookOutboxRecord(
        long id,
        String eventKey,
        String eventEnvelope,
        int attemptCount
) {
}
