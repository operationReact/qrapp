package com.broandbro.qrapp.whatsapp;

import java.io.IOException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;

@Service
@Slf4j
public class WhatsAppWebhookService {

    private static final String SOURCE = "META_WHATSAPP";

    private final ObjectMapper objectMapper;
    private final JdbcTemplate jdbcTemplate;

    public WhatsAppWebhookService(
            ObjectMapper objectMapper,
            JdbcTemplate jdbcTemplate
    ) {
        this.objectMapper = objectMapper;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional
    public void accept(byte[] rawBody) {
        String rawPayload = new String(rawBody, StandardCharsets.UTF_8);
        int insertedCount = 0;
        for (ParsedEvent parsedEvent : parse(rawBody)) {
            WhatsAppWebhookEvent event = parsedEvent.event();
            String eventKey = eventKey(rawBody, parsedEvent);
            String serializedEvent;

            try {
                serializedEvent = objectMapper.writeValueAsString(event);
            } catch (IOException ex) {
                throw new WhatsAppWebhookProcessingException(
                        "WhatsApp webhook could not be serialized",
                        ex
                );
            }

            int inserted;
            try {
                inserted = jdbcTemplate.update(
                        "INSERT INTO whatsapp_webhook_outbox "
                                + "(event_key, payload_raw, event_envelope, status, received_at, available_at) "
                                + "VALUES (?, ?, ?, 'PENDING', NOW(), NOW()) "
                                + "ON CONFLICT (event_key) DO NOTHING",
                        eventKey,
                        rawPayload,
                        serializedEvent
                );
            } catch (DataAccessException ex) {
                throw new WhatsAppWebhookProcessingException(
                        "WhatsApp webhook could not be persisted",
                        ex
                );
            }
            if (inserted == 0) {
                try {
                    jdbcTemplate.update(
                            "UPDATE whatsapp_webhook_outbox "
                                    + "SET status = 'PENDING', available_at = NOW(), "
                                    + "last_error = NULL, claimed_by = NULL, claim_until = NULL "
                                    + "WHERE event_key = ? AND status = 'FAILED'",
                            eventKey
                    );
                } catch (DataAccessException ex) {
                    throw new WhatsAppWebhookProcessingException(
                            "WhatsApp webhook duplicate state could not be updated",
                            ex
                    );
                }
                log.info("Duplicate WhatsApp webhook retained for outbox processing: eventKey={}", eventKey);
                continue;
            }

            insertedCount++;
            log.info(
                    "WhatsApp webhook event persisted as PENDING: eventKey={}, eventTypes={}, wabaIds={}, phoneNumberIds={}, eventIds={}",
                    eventKey, event.eventTypes(), event.wabaIds(), event.phoneNumberIds(), event.eventIds()
            );
        }
        log.info("WhatsApp webhook persisted: pendingEvents={}", insertedCount);
    }

    private List<ParsedEvent> parse(byte[] rawBody) {
        if (rawBody == null || rawBody.length == 0) {
            throw new IllegalArgumentException("Webhook request body is required");
        }

        try {
            JsonNode payload = objectMapper.readTree(rawBody);
            if (payload == null || !payload.isObject()) {
                throw new IllegalArgumentException("Webhook request body must be a JSON object");
            }

            List<ParsedEvent> events = new ArrayList<>();

            JsonNode entries = payload.path("entry");
            if (entries.isArray()) {
                int entryIndex = 0;
                for (JsonNode entry : entries) {
                    String wabaId = text(entry, "id");
                    JsonNode changes = entry.path("changes");
                    if (!changes.isArray()) {
                        entryIndex++;
                        continue;
                    }
                    int changeIndex = 0;
                    for (JsonNode change : changes) {
                        String field = text(change, "field");
                        JsonNode value = change.path("value");
                        JsonNode metadata = value.path("metadata");
                        List<JsonNode> errors = errorNodes(value.path("errors"));
                        boolean producedEvent = false;

                        JsonNode messages = value.path("messages");
                        if (messages.isArray()) {
                            int messageIndex = 0;
                            for (JsonNode message : messages) {
                                WhatsAppWebhookEvent.MessageMetadata messageMetadata =
                                        messageMetadata(message);
                                events.add(new ParsedEvent(
                                        event(payload, wabaId, metadata, field, messageMetadata, null, errors),
                                        "entry-" + entryIndex + "-change-" + changeIndex
                                                + "-message-" + messageIndex
                                ));
                                producedEvent = true;
                                messageIndex++;
                            }
                        }

                        JsonNode statuses = value.path("statuses");
                        if (statuses.isArray()) {
                            int statusIndex = 0;
                            for (JsonNode status : statuses) {
                                WhatsAppWebhookEvent.StatusMetadata statusMetadata =
                                        statusMetadata(status);
                                events.add(new ParsedEvent(
                                        event(payload, wabaId, metadata, field, null, statusMetadata, errors),
                                        "entry-" + entryIndex + "-change-" + changeIndex
                                                + "-status-" + statusIndex
                                ));
                                producedEvent = true;
                                statusIndex++;
                            }
                        }

                        if (!producedEvent) {
                            events.add(new ParsedEvent(
                                    event(payload, wabaId, metadata, field, null, null, errors),
                                    "entry-" + entryIndex + "-change-" + changeIndex
                            ));
                        }
                        changeIndex++;
                    }
                    entryIndex++;
                }
            }

            if (events.isEmpty()) {
                events.add(new ParsedEvent(
                        event(payload, null, null, null, null, null, List.of()),
                        "payload"
                ));
            }
            return events;
        } catch (IOException ex) {
            throw new IllegalArgumentException("Webhook request body is malformed JSON", ex);
        }
    }

    private WhatsAppWebhookEvent event(
            JsonNode payload,
            String wabaId,
            JsonNode metadata,
            String field,
            WhatsAppWebhookEvent.MessageMetadata message,
            WhatsAppWebhookEvent.StatusMetadata status,
            List<JsonNode> errors
    ) {
        return new WhatsAppWebhookEvent(
                SOURCE,
                Instant.now(),
                payload,
                singleton(wabaId),
                singleton(text(metadata, "phone_number_id")),
                singleton(text(metadata, "display_phone_number")),
                message != null
                        ? singleton(message.id())
                        : status != null ? singleton(status.id()) : List.of(),
                singleton(field),
                message == null ? List.of() : List.of(message),
                status == null ? List.of() : List.of(status),
                errors
        );
    }

    private WhatsAppWebhookEvent.MessageMetadata messageMetadata(JsonNode message) {
        return new WhatsAppWebhookEvent.MessageMetadata(
                text(message, "id"),
                text(message, "from"),
                text(message, "type"),
                text(message, "timestamp"),
                text(message.path("text"), "body")
        );
    }

    private WhatsAppWebhookEvent.StatusMetadata statusMetadata(JsonNode status) {
        return new WhatsAppWebhookEvent.StatusMetadata(
                text(status, "id"),
                text(status, "recipient_id"),
                text(status, "status"),
                text(status, "timestamp")
        );
    }

    private List<JsonNode> errorNodes(JsonNode errorsNode) {
        List<JsonNode> errors = new ArrayList<>();
        if (errorsNode.isArray()) {
            errorsNode.forEach(errors::add);
        }
        return errors;
    }

    private String eventKey(byte[] rawBody, ParsedEvent parsedEvent) {
        WhatsAppWebhookEvent event = parsedEvent.event();
        List<String> eventIds = event.eventIds();
        String identity = eventIds.isEmpty()
                ? HexFormat.of().formatHex(hash(
                        (new String(rawBody, StandardCharsets.UTF_8) + "|"
                                + parsedEvent.fallbackIdentity()).getBytes(StandardCharsets.UTF_8)
                ))
                : eventIdentity(event, eventIds.get(0));
        return HexFormat.of().formatHex(hash(
                (SOURCE + "|" + identity).getBytes(StandardCharsets.UTF_8)
        ));
    }

    private String eventIdentity(WhatsAppWebhookEvent event, String eventId) {
        if (!event.messages().isEmpty()) {
            return "message|" + eventId;
        }
        if (!event.statuses().isEmpty()) {
            WhatsAppWebhookEvent.StatusMetadata status = event.statuses().get(0);
            return "status|" + eventId + "|" + status.status() + "|" + status.timestamp();
        }
        return "event|" + eventId;
    }

    private byte[] hash(byte[] value) {
        try {
            return MessageDigest.getInstance("SHA-256").digest(value);
        } catch (Exception ex) {
            throw new IllegalStateException("SHA-256 is unavailable", ex);
        }
    }

    private String text(JsonNode node, String field) {
        JsonNode value = node == null ? null : node.get(field);
        return value != null && value.isValueNode() ? value.asText() : null;
    }

    private List<String> singleton(String value) {
        return StringUtils.hasText(value) ? List.of(value) : List.of();
    }

    private record ParsedEvent(WhatsAppWebhookEvent event, String fallbackIdentity) {
    }
}
