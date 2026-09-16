package com.broandbro.qrapp.whatsapp;

import com.fasterxml.jackson.databind.JsonNode;

import java.time.Instant;
import java.util.List;

public record WhatsAppWebhookEvent(
        String source,
        Instant receivedAt,
        JsonNode payload,
        List<String> wabaIds,
        List<String> phoneNumberIds,
        List<String> displayPhoneNumbers,
        List<String> eventIds,
        List<String> eventTypes,
        List<MessageMetadata> messages,
        List<StatusMetadata> statuses,
        List<JsonNode> errors
) {
    public record MessageMetadata(
            String id,
            String customerWhatsappNumber,
            String type,
            String timestamp,
            String text
    ) {
    }

    public record StatusMetadata(
            String id,
            String recipientId,
            String status,
            String timestamp
    ) {
    }
}
