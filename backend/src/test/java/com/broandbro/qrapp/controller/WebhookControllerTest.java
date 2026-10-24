package com.broandbro.qrapp.controller;

import com.broandbro.qrapp.config.RazorpayProperties;
import com.broandbro.qrapp.service.RazorpayWebhookService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class WebhookControllerTest {

    private static final String SECRET = "webhook-secret";
    private MockMvc mockMvc;

    @Mock
    private RazorpayWebhookService webhookService;

    @BeforeEach
    void setUp() {
        RazorpayProperties properties = new RazorpayProperties();
        properties.setWebhookSecret(SECRET);
        lenient().when(webhookService.process(any(), any(), any(), any(), any()))
                .thenReturn(RazorpayWebhookService.ProcessingResult.IGNORED);
        mockMvc = MockMvcBuilders.standaloneSetup(
                new WebhookController(properties, webhookService, new ObjectMapper())
        ).build();
    }

    @Test
    void paymentCapturedExtractsNestedPaymentIds() throws Exception {
        String body = """
                {"id":"evt_captured","event":"payment.captured","payload":{"payment":{"entity":{"id":"pay_123","order_id":"order_123"}}}}
                """;

        postSigned(body).andExpect(status().isOk());

        verify(webhookService).process(eq("evt_captured"), eq("payment.captured"), eq("pay_123"), eq("order_123"), any());
    }

    @Test
    void paymentAuthorizedIsAcknowledgedAndExtracted() throws Exception {
        postSigned("""
                {"id":"evt_authorized","event":"payment.authorized","payload":{"payment":{"entity":{"id":"pay_124","order_id":"order_124"}}}}
                """).andExpect(status().isOk());

        verify(webhookService).process(eq("evt_authorized"), eq("payment.authorized"), eq("pay_124"), eq("order_124"), any());
    }

    @Test
    void paymentFailedIsAcknowledgedAndExtracted() throws Exception {
        postSigned("""
                {"id":"evt_failed","event":"payment.failed","payload":{"payment":{"entity":{"id":"pay_125","order_id":"order_125"}}}}
                """).andExpect(status().isOk());

        verify(webhookService).process(eq("evt_failed"), eq("payment.failed"), eq("pay_125"), eq("order_125"), any());
    }

    @Test
    void orderPaidPrefersOrderEntityId() throws Exception {
        postSigned("""
                {"id":"evt_paid","event":"order.paid","payload":{"order":{"entity":{"id":"order_primary"}},"payment":{"entity":{"id":"pay_126","order_id":"order_fallback"}}}}
                """).andExpect(status().isOk());

        verify(webhookService).process(eq("evt_paid"), eq("order.paid"), eq("pay_126"), eq("order_primary"), any());
    }

    @Test
    void orderPaidFallsBackToPaymentOrderId() throws Exception {
        postSigned("""
                {"id":"evt_paid_fallback","event":"order.paid","payload":{"order":{"entity":{}},"payment":{"entity":{"id":"pay_127","order_id":"order_fallback"}}}}
                """).andExpect(status().isOk());

        verify(webhookService).process(eq("evt_paid_fallback"), eq("order.paid"), eq("pay_127"), eq("order_fallback"), any());
    }

    @Test
    void invalidSignatureIsUnauthorized() throws Exception {
        mockMvc.perform(post("/webhook/razorpay")
                        .contentType("application/json")
                        .header("X-Razorpay-Signature", "0".repeat(64))
                        .content("{}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void missingSignatureIsUnauthorized() throws Exception {
        mockMvc.perform(post("/webhook/razorpay")
                        .contentType("application/json")
                        .content("{}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void missingWebhookSecretIsServiceUnavailable() throws Exception {
        RazorpayProperties properties = new RazorpayProperties();
        MockMvc controller = MockMvcBuilders.standaloneSetup(
                new WebhookController(properties, webhookService, new ObjectMapper())
        ).build();

        controller.perform(post("/webhook/razorpay")
                        .contentType("application/json")
                        .header("X-Razorpay-Signature", "anything")
                        .content("{}"))
                .andExpect(status().isServiceUnavailable());
    }

    @Test
    void malformedJsonIsBadRequestAfterSignatureValidation() throws Exception {
        postSigned("{").andExpect(status().isBadRequest());
    }

    @Test
    void duplicateEventIsAcknowledged() throws Exception {
        when(webhookService.process(eq("evt_duplicate"), eq("payment.captured"), eq("pay_128"), eq("order_128"), any()))
                .thenReturn(RazorpayWebhookService.ProcessingResult.DUPLICATE);

        postSigned("""
                {"id":"evt_duplicate","event":"payment.captured","payload":{"payment":{"entity":{"id":"pay_128","order_id":"order_128"}}}}
                """).andExpect(status().isOk());
    }

    @Test
    void unknownEventIsAcknowledged() throws Exception {
        postSigned("""
                {"id":"evt_unknown","event":"refund.created","payload":{"refund":{"entity":{"id":"rfnd_1"}}}}
                """).andExpect(status().isOk());
    }

    @Test
    void paymentEventWithoutGenericRazorpayOrderIdIsStillAcknowledged() throws Exception {
        String body = "{\"id\":\"evt_optional\",\"event\":\"payment.captured\",\"payload\":{\"payment\":{\"entity\":{\"id\":\"pay_129\",\"order_id\":\"order_129\"}}}}";

        postSigned(body).andExpect(status().isOk());

        ArgumentCaptor<String> orderId = ArgumentCaptor.forClass(String.class);
        verify(webhookService).process(eq("evt_optional"), eq("payment.captured"), eq("pay_129"), orderId.capture(), any());
        assertThat(orderId.getValue()).isEqualTo("order_129");
    }

    private org.springframework.test.web.servlet.ResultActions postSigned(String body) throws Exception {
        byte[] raw = body.getBytes(StandardCharsets.UTF_8);
        return mockMvc.perform(post("/webhook/razorpay")
                .contentType("application/json")
                .header("X-Razorpay-Signature", signature(raw))
                .content(raw));
    }

    private String signature(byte[] body) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return HexFormat.of().formatHex(mac.doFinal(body));
    }
}
