package com.broandbro.qrapp.whatsapp;

import com.broandbro.qrapp.ops.SchedulerJobControl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentMatchers;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WhatsAppWebhookProcessorTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    private WhatsAppWebhookProcessor processor;

    @BeforeEach
    void setUp() {
        processor = new WhatsAppWebhookProcessor(jdbcTemplate, mock(SchedulerJobControl.class));
        lenient().when(jdbcTemplate.update(anyString())).thenReturn(0);
        lenient().when(jdbcTemplate.update(anyString(), any(Object[].class))).thenReturn(1);
    }

    @Test
    void completesEventAfterBusinessProcessing() {
        when(jdbcTemplate.query(anyString(),
                ArgumentMatchers.<RowMapper<WhatsAppWebhookOutboxRecord>>any()))
                .thenReturn(List.of(pendingRecord()));

        processor.processPending();

        verify(jdbcTemplate).update(contains("status = 'COMPLETED'"), any(Object[].class));
    }

    @Test
    void marksBusinessFailureRetryable() {
        WhatsAppWebhookProcessor failingProcessor = new WhatsAppWebhookProcessor(jdbcTemplate, mock(SchedulerJobControl.class)) {
            @Override
            protected void processBusinessEvent(WhatsAppWebhookOutboxRecord record) {
                throw new IllegalStateException("business failure");
            }
        };
        when(jdbcTemplate.query(anyString(),
                ArgumentMatchers.<RowMapper<WhatsAppWebhookOutboxRecord>>any()))
                .thenReturn(List.of(pendingRecord()));

        failingProcessor.processPending();

        verify(jdbcTemplate).update(contains("status = 'FAILED'"), any(Object[].class));
        verify(jdbcTemplate, never()).update(contains("status = 'COMPLETED'"), any(Object[].class));
    }

    @Test
    void recoversExpiredProcessingRecordsBeforeClaiming() {
        when(jdbcTemplate.query(anyString(),
                ArgumentMatchers.<RowMapper<WhatsAppWebhookOutboxRecord>>any()))
                .thenReturn(List.of(pendingRecord()));

        processor.processPending();

        verify(jdbcTemplate, atLeastOnce()).update(contains("claim_until < NOW()"));
        verify(jdbcTemplate, atLeastOnce()).update(contains("status = 'PROCESSING'"), any(Object[].class));
    }

    @Test
    void doesNotProcessWhenAnotherWorkerClaimsTheRow() {
        when(jdbcTemplate.query(anyString(),
                ArgumentMatchers.<RowMapper<WhatsAppWebhookOutboxRecord>>any()))
                .thenReturn(List.of(pendingRecord()));
        doReturn(0).when(jdbcTemplate).update(anyString(), any(Object[].class));

        processor.processPending();

        verify(jdbcTemplate, never()).update(contains("status = 'COMPLETED'"), any(Object[].class));
    }

    @Test
    void scheduledProcessorRunsInsideDatabaseTransaction() throws NoSuchMethodException {
        assertNotNull(WhatsAppWebhookProcessor.class
                .getMethod("processPendingScheduled")
                .getAnnotation(Transactional.class));
    }

    @Test
    void databaseFailureIsNotConvertedIntoCompletion() {
        when(jdbcTemplate.update(anyString()))
                .thenThrow(new DataAccessResourceFailureException("database unavailable"));

        org.junit.jupiter.api.Assertions.assertThrows(
                DataAccessResourceFailureException.class,
                () -> processor.processPending()
        );
    }

    private WhatsAppWebhookOutboxRecord pendingRecord() {
        return new WhatsAppWebhookOutboxRecord(42L, "event-key", "event-envelope", 0);
    }
}
