package com.broandbro.qrapp.whatsapp;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.jdbc.core.JdbcTemplate;

import java.nio.charset.StandardCharsets;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.mockito.ArgumentCaptor;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WhatsAppWebhookServiceTest {

    @Mock
    private JdbcTemplate jdbcTemplate;
    private WhatsAppWebhookService service;

    @BeforeEach
    void setUp() {
        service = new WhatsAppWebhookService(
                new ObjectMapper().findAndRegisterModules(), jdbcTemplate
        );
        lenient().when(jdbcTemplate.update(anyString(), any(Object[].class))).thenReturn(1);
    }

    @Test
    void publishesCompletePayloadAndMetadataForMultipleChanges() throws Exception {
        String body = """
                {"object":"whatsapp_business_account","entry":[
                  {"id":"waba-1","changes":[
                    {"field":"messages","value":{"metadata":{"phone_number_id":"phone-1","display_phone_number":"123"},"messages":[{"id":"wamid-1","from":"919999999999","type":"text","timestamp":"1","text":{"body":"hello"}}]}},
                    {"field":"messages","value":{"statuses":[{"id":"wamid-1","recipient_id":"919999999999","status":"delivered","timestamp":"2"}]}}
                  ]},
                  {"id":"waba-2","changes":[{"field":"messages","value":{"messages":[{"id":"wamid-3","type":"image"}]}}]}
                ]}""";

        service.accept(body.getBytes(StandardCharsets.UTF_8));

        verify(jdbcTemplate, times(3)).update(
                contains("INSERT INTO whatsapp_webhook_outbox"),
                any(Object[].class)
        );

        ArgumentCaptor<Object[]> arguments = ArgumentCaptor.forClass(Object[].class);
        verify(jdbcTemplate, times(3)).update(
                contains("INSERT INTO whatsapp_webhook_outbox"),
                arguments.capture()
        );
        Set<Object> eventKeys = new HashSet<>();
        for (Object[] values : arguments.getAllValues()) {
            eventKeys.add(values[0]);
        }
        org.junit.jupiter.api.Assertions.assertEquals(3, eventKeys.size());
    }

    @Test
    void duplicateDeliveryAfterPublishedDoesNotCreateAnotherOutboxRecord() {
        when(jdbcTemplate.update(anyString(), any(Object[].class))).thenReturn(0);

        service.accept("{\"entry\":[{\"id\":\"waba\",\"changes\":[{\"field\":\"messages\",\"value\":{\"messages\":[{\"id\":\"wamid-1\"}]}}]}]}"
                .getBytes(StandardCharsets.UTF_8));

        verify(jdbcTemplate).update(
                contains("UPDATE whatsapp_webhook_outbox"),
                any(Object[].class)
        );
    }

    @Test
    void malformedJsonIsRejectedBeforeProcessing() {
        org.junit.jupiter.api.Assertions.assertThrows(
                IllegalArgumentException.class,
                () -> service.accept("{".getBytes(StandardCharsets.UTF_8))
        );
        verifyNoInteractions(jdbcTemplate);
    }

    @Test
    void databaseFailureIsReturnedToCallerSoMetaCanRetry() {
        when(jdbcTemplate.update(anyString(), any(Object[].class)))
                .thenThrow(new DataAccessResourceFailureException("database unavailable"));

        org.junit.jupiter.api.Assertions.assertThrows(
                WhatsAppWebhookProcessingException.class,
                () -> service.accept("{\"entry\":[]}".getBytes(StandardCharsets.UTF_8))
        );
    }
}
