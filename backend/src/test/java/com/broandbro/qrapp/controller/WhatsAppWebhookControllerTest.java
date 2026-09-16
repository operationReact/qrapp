package com.broandbro.qrapp.controller;

import com.broandbro.qrapp.whatsapp.WhatsAppWebhookProcessingException;
import com.broandbro.qrapp.whatsapp.WhatsAppWebhookProperties;
import com.broandbro.qrapp.whatsapp.WhatsAppWebhookService;
import com.broandbro.qrapp.whatsapp.WhatsAppWebhookSignatureValidator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class WhatsAppWebhookControllerTest {

    private static final String SECRET = "app-secret";
    private MockMvc mockMvc;

    @Mock
    private WhatsAppWebhookService webhookService;

    @BeforeEach
    void setUp() {
        WhatsAppWebhookProperties properties =
                new WhatsAppWebhookProperties("verify-token", SECRET);
        mockMvc = MockMvcBuilders.standaloneSetup(new WhatsAppWebhookController(
                properties,
                new WhatsAppWebhookSignatureValidator(properties),
                webhookService
        )).build();
    }

    @Test
    void verifiesValidMetaRequestWithExactChallenge() throws Exception {
        mockMvc.perform(get("/webhooks/whatsapp")
                        .param("hub.mode", "subscribe")
                        .param("hub.challenge", "1158201444")
                        .param("hub.verify_token", "verify-token"))
                .andExpect(status().isOk())
                .andExpect(content().string("1158201444"));
    }

    @Test
    void rejectsInvalidVerificationToken() throws Exception {
        mockMvc.perform(get("/webhooks/whatsapp")
                        .param("hub.mode", "subscribe")
                        .param("hub.challenge", "1158201444")
                        .param("hub.verify_token", "wrong"))
                .andExpect(status().isForbidden());
    }

    @Test
    void rejectsWrongVerificationMode() throws Exception {
        mockMvc.perform(get("/webhooks/whatsapp")
                        .param("hub.mode", "ping")
                        .param("hub.challenge", "1158201444")
                        .param("hub.verify_token", "verify-token"))
                .andExpect(status().isForbidden());
    }

    @Test
    void acceptsValidSignedWebhook() throws Exception {
        byte[] body = "{\"object\":\"whatsapp_business_account\"}".getBytes(StandardCharsets.UTF_8);

        mockMvc.perform(post("/webhooks/whatsapp")
                        .contentType("application/json")
                        .header("X-Hub-Signature-256", signature(body))
                        .content(body))
                .andExpect(status().isOk());

        verify(webhookService).accept(body);
    }

    @Test
    void rejectsInvalidSignature() throws Exception {
        mockMvc.perform(post("/webhooks/whatsapp")
                        .contentType("application/json")
                        .header("X-Hub-Signature-256", "sha256=" + "0".repeat(64))
                        .content("{}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void rejectsMissingSignature() throws Exception {
        mockMvc.perform(post("/webhooks/whatsapp")
                        .contentType("application/json")
                        .content("{}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void rejectsMalformedSignature() throws Exception {
        mockMvc.perform(post("/webhooks/whatsapp")
                        .contentType("application/json")
                        .header("X-Hub-Signature-256", "not-a-signature")
                        .content("{}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void rejectsMalformedJsonAfterSignatureValidation() throws Exception {
        byte[] body = "{".getBytes(StandardCharsets.UTF_8);
        doThrow(new IllegalArgumentException("malformed"))
                .when(webhookService).accept(any(byte[].class));

        mockMvc.perform(post("/webhooks/whatsapp")
                        .contentType("application/json")
                        .header("X-Hub-Signature-256", signature(body))
                        .content(body))
                .andExpect(status().isBadRequest());
    }

    @Test
    void surfacesPersistenceFailureWithoutAcknowledging() throws Exception {
        byte[] body = "{}".getBytes(StandardCharsets.UTF_8);
        doThrow(new WhatsAppWebhookProcessingException("publish failed", new RuntimeException()))
                .when(webhookService).accept(any(byte[].class));

        mockMvc.perform(post("/webhooks/whatsapp")
                        .contentType("application/json")
                        .header("X-Hub-Signature-256", signature(body))
                        .content(body))
                .andExpect(status().isServiceUnavailable());
    }

    private String signature(byte[] body) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return "sha256=" + HexFormat.of().formatHex(mac.doFinal(body));
    }
}
