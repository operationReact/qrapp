package com.broandbro.qrapp.whatsapp;

import com.broandbro.qrapp.config.WhatsAppOtpProperties;
import com.broandbro.qrapp.exception.WhatsAppDeliveryException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.reactive.function.client.ClientResponse;
import org.springframework.web.reactive.function.client.ExchangeFunction;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import static org.assertj.core.api.Assertions.*;

class WhatsAppCloudApiClientTest {
    @Test
    void acceptsMetaSuccessResponse() {
        WhatsAppCloudApiClient client = clientWith(response(HttpStatus.OK,
                "{\"messages\":[{\"id\":\"wamid.test\"}]}"));

        assertThatCode(() -> client.sendAuthenticationCode("+919876543210", "123456"))
                .doesNotThrowAnyException();
    }

    @Test
    void mapsMetaClientErrorsWithoutExposingResponseBody() {
        for (HttpStatus status : new HttpStatus[]{HttpStatus.BAD_REQUEST, HttpStatus.UNAUTHORIZED,
                HttpStatus.TOO_MANY_REQUESTS, HttpStatus.INTERNAL_SERVER_ERROR}) {
            WhatsAppCloudApiClient client = clientWith(response(status,
                    "{\"error\":{\"code\":\"secret-provider-detail\",\"message\":\"private detail\"}}"));

            WhatsAppDeliveryException exception = catchThrowableOfType(
                    () -> client.sendAuthenticationCode("+919876543210", "123456"),
                    WhatsAppDeliveryException.class);

            assertThat(exception.getStatusCode()).isEqualTo(status.value());
            assertThat(exception).hasMessage("WhatsApp OTP delivery failed");
            assertThat(exception).hasMessageNotContaining("private detail");
            assertThat(exception).hasMessageNotContaining("123456");
        }
    }

    @Test
    void rejectsMalformedSuccessfulProviderResponse() {
        WhatsAppCloudApiClient client = clientWith(response(HttpStatus.OK, "{}"));

        assertThatThrownBy(() -> client.sendAuthenticationCode("+919876543210", "123456"))
                .isInstanceOf(WhatsAppDeliveryException.class);
    }

    @Test
    void mapsTransportTimeoutToSafeDeliveryFailure() {
        WhatsAppOtpProperties properties = properties();
        properties.getGraphApi().setTimeoutSeconds(1);
        ExchangeFunction exchange = request -> Mono.never();
        WhatsAppCloudApiClient client = new WhatsAppCloudApiClient(
                WebClient.builder().exchangeFunction(exchange), properties, new ObjectMapper());

        assertThatThrownBy(() -> client.sendAuthenticationCode("+919876543210", "123456"))
                .isInstanceOf(WhatsAppDeliveryException.class)
                .hasMessage("WhatsApp OTP delivery failed");
    }

    private WhatsAppCloudApiClient clientWith(ClientResponse response) {
        return new WhatsAppCloudApiClient(
                WebClient.builder().exchangeFunction(request -> Mono.just(response)),
                properties(), new ObjectMapper());
    }

    private ClientResponse response(HttpStatus status, String body) {
        return ClientResponse.create(status).body(body).build();
    }

    private WhatsAppOtpProperties properties() {
        WhatsAppOtpProperties properties = new WhatsAppOtpProperties();
        properties.setEnabled(true);
        properties.setPhoneNumberId("phone-id");
        properties.setAccessToken("access-token");
        properties.getGraphApi().setTimeoutSeconds(1);
        return properties;
    }
}
