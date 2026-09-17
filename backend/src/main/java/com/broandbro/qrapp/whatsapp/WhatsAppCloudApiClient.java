package com.broandbro.qrapp.whatsapp;

import com.broandbro.qrapp.config.WhatsAppOtpProperties;
import com.broandbro.qrapp.exception.WhatsAppDeliveryException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.List;
import java.util.Map;

@Component
@Slf4j
public class WhatsAppCloudApiClient {
    private final WebClient client;
    private final WhatsAppOtpProperties properties;
    private final ObjectMapper objectMapper;

    public WhatsAppCloudApiClient(WebClient.Builder builder,
                                  WhatsAppOtpProperties properties,
                                  ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.client = builder.baseUrl(properties.getGraphApi().getBaseUrl()).build();
    }

    public void sendAuthenticationCode(String phoneNumber, String otp) {
        if (!properties.isEnabled() || properties.getPhoneNumberId() == null
                || properties.getPhoneNumberId().isBlank()
                || properties.getAccessToken() == null || properties.getAccessToken().isBlank()) {
            throw new WhatsAppDeliveryException("WhatsApp OTP delivery is not configured", null);
        }

        Map<String, Object> payload = Map.of(
                "messaging_product", "whatsapp",
                "recipient_type", "individual",
                "to", phoneNumber,
                "type", "template",
                "template", Map.of(
                        "name", properties.getVerificationTemplateName(),
                        "language", Map.of("code", properties.getVerificationTemplateLanguage()),
                        "components", List.of(
                                Map.of("type", "body", "parameters",
                                        List.of(Map.of("type", "text", "text", otp))),
                                Map.of("type", "button", "sub_type", "url", "index", "0",
                                        "parameters", List.of(Map.of("type", "text", "text", otp)))
                        )
                )
        );

        try {
            client.post()
                    .uri("/{version}/{phoneNumberId}/messages",
                            properties.getGraphApi().getVersion(), properties.getPhoneNumberId())
                    .headers(headers -> headers.setBearerAuth(properties.getAccessToken()))
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(payload)
                    .exchangeToMono(response -> response.bodyToMono(String.class)
                            .defaultIfEmpty("")
                            .flatMap(body -> {
                                if (response.statusCode().is2xxSuccessful()) {
                                    try {
                                        JsonNode responseBody = objectMapper.readTree(body);
                                        if (responseBody.path("messages").isArray()
                                                && responseBody.path("messages").size() > 0) {
                                            return Mono.empty();
                                        }
                                    } catch (Exception ignored) {
                                        // Treat malformed provider responses as delivery failures.
                                    }
                                    throw new WhatsAppDeliveryException("WhatsApp OTP delivery failed", null);
                                }
                                throw metaFailure(response.statusCode().value(), body);
                            }))
                    .timeout(Duration.ofSeconds(properties.getGraphApi().getTimeoutSeconds()))
                    .block();
        } catch (WhatsAppDeliveryException ex) {
            throw ex;
        } catch (Exception ex) {
            log.warn("WhatsApp OTP request failed due to transport error");
            throw new WhatsAppDeliveryException("WhatsApp OTP delivery failed", ex);
        }
    }

    private WhatsAppDeliveryException metaFailure(int status, String body) {
        String code = null;
        try {
            JsonNode error = objectMapper.readTree(body).path("error");
            if (!error.isMissingNode()) code = error.path("code").asText(null);
        } catch (Exception ignored) {
            // The safe application error does not depend on Meta's response format.
        }
        return new WhatsAppDeliveryException(status, code);
    }
}
