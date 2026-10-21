package com.broandbro.qrapp.whatsapp;

import lombok.extern.slf4j.Slf4j;
import com.broandbro.qrapp.ops.SchedulerJobControl;
import com.broandbro.qrapp.ops.SchedulerJobIds;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@Slf4j
public class WhatsAppWebhookProcessor {

    private final JdbcTemplate jdbcTemplate;
    private final SchedulerJobControl schedulerJobControl;
    private final String processorId = UUID.randomUUID().toString();

    public WhatsAppWebhookProcessor(JdbcTemplate jdbcTemplate, SchedulerJobControl schedulerJobControl) {
        this.jdbcTemplate = jdbcTemplate;
        this.schedulerJobControl = schedulerJobControl;
    }

    @Scheduled(fixedDelayString = "${whatsapp.webhook.processor-interval-ms:1000}")
    @Transactional
    public void processPendingScheduled() {
        if (schedulerJobControl.isPaused(SchedulerJobIds.WHATSAPP_OUTBOX)) {
            return;
        }
        processPending();
    }

    @Transactional
    public void processPending() {
        recoverRetryableRecords();

        List<WhatsAppWebhookOutboxRecord> records = jdbcTemplate.query(
                "SELECT id, event_key, event_envelope, attempt_count "
                        + "FROM whatsapp_webhook_outbox "
                        + "WHERE status = 'PENDING' AND available_at <= NOW() "
                        + "ORDER BY id FOR UPDATE SKIP LOCKED LIMIT 1",
                (rs, rowNum) -> new WhatsAppWebhookOutboxRecord(
                        rs.getLong("id"),
                        rs.getString("event_key"),
                        rs.getString("event_envelope"),
                        rs.getInt("attempt_count")
                )
        );

        if (records.isEmpty()) {
            return;
        }

        WhatsAppWebhookOutboxRecord record = records.get(0);
        int claimed = jdbcTemplate.update(
                "UPDATE whatsapp_webhook_outbox "
                        + "SET status = 'PROCESSING', attempt_count = attempt_count + 1, "
                        + "claimed_by = ?, claim_until = NOW() + INTERVAL '1 minute' "
                        + "WHERE id = ? AND status = 'PENDING'",
                processorId,
                record.id()
        );
        if (claimed == 0) {
            return;
        }

        try {
            processBusinessEvent(record);
            int completed = jdbcTemplate.update(
                    "UPDATE whatsapp_webhook_outbox "
                            + "SET status = 'COMPLETED', published_at = NOW(), "
                            + "claimed_by = NULL, claim_until = NULL, last_error = NULL "
                            + "WHERE id = ? AND status = 'PROCESSING' AND claimed_by = ?",
                    record.id(),
                    processorId
            );
            if (completed == 1) {
                log.info(
                        "WhatsApp webhook event completed: eventKey={}, attempt={}",
                        record.eventKey(), record.attemptCount() + 1
                );
            }
        } catch (Exception ex) {
            jdbcTemplate.update(
                    "UPDATE whatsapp_webhook_outbox "
                            + "SET status = 'FAILED', available_at = NOW() + INTERVAL '5 seconds', "
                            + "last_error = ?, claimed_by = NULL, claim_until = NULL "
                            + "WHERE id = ? AND status = 'PROCESSING' AND claimed_by = ?",
                    errorMessage(ex),
                    record.id(),
                    processorId
            );
            log.warn(
                    "WhatsApp webhook event processing failed and will retry: eventKey={}, attempt={}",
                    record.eventKey(), record.attemptCount() + 1
            );
        }
    }

    protected void processBusinessEvent(WhatsAppWebhookOutboxRecord record) {
        log.debug(
                "Processing WhatsApp webhook event: eventKey={}, envelopeSize={}",
                record.eventKey(), record.eventEnvelope().length()
        );
    }

    private void recoverRetryableRecords() {
        jdbcTemplate.update(
                "UPDATE whatsapp_webhook_outbox "
                        + "SET status = 'PENDING', claimed_by = NULL, claim_until = NULL "
                        + "WHERE (status = 'FAILED' AND available_at <= NOW()) "
                        + "OR (status = 'PROCESSING' AND claim_until < NOW())"
        );
    }

    private String errorMessage(Exception ex) {
        String message = ex.getMessage();
        if (message == null || message.isBlank()) {
            return ex.getClass().getSimpleName();
        }
        return message.length() > 1000 ? message.substring(0, 1000) : message;
    }
}
