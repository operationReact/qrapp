package com.broandbro.qrapp.service;

import com.broandbro.qrapp.config.TwoFactorProperties;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Mono;

import java.time.Duration;

/**
 * Minimal TwoFactor HTTP client using WebClient.
 * Only parses minimal fields so unexpected responses are handled gracefully.
 */
@Component
@Slf4j
public class TwoFactorClientImpl implements TwoFactorClient {

    private final WebClient client;
    private final TwoFactorProperties props;
    private final ObjectMapper mapper = new ObjectMapper();

    public TwoFactorClientImpl(TwoFactorProperties props) {
        this.props = props;
        this.client = WebClient.builder()
                .baseUrl(props.getBaseUrl())
                .build();
    }

    @Override
    public String generateOtp(String mobile) throws TwoFactorException {
        ensureApiKey();
        String url = String.format("/%s/SMS/%s/AUTOGEN", props.getApiKey(), mobile);
        try {
            String body = client.get()
                    .uri(url)
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofSeconds(10))
                    .block();

            if (body == null) throw new TwoFactorException("Empty response from 2Factor");
            JsonNode n = mapper.readTree(body);
            String status = n.path("Status").asText("");
            String details = n.path("Details").asText("");
            if ("Success".equalsIgnoreCase(status) && details != null && !details.isEmpty()) {
                return details; // session id
            }
            log.warn("2Factor generateOtp failed: status={} details={}", status, details);
            throw new TwoFactorException("Failed to send OTP");
        } catch (WebClientResponseException e) {
            log.warn("2Factor generateOtp http error: {}", e.getStatusCode());
            if (e.getStatusCode() == HttpStatus.TOO_MANY_REQUESTS) {
                throw new TwoFactorException("Rate limited by OTP provider", e);
            }
            throw new TwoFactorException("2Factor HTTP error", e);
        } catch (Exception e) {
            throw new TwoFactorException("2Factor generateOtp error", e);
        }
    }

    @Override
    public boolean verifyOtp(String sessionId, String otp) throws TwoFactorException {
        ensureApiKey();
        String url = String.format("/%s/SMS/VERIFY/%s/%s", props.getApiKey(), sessionId, otp);
        try {
            String body = client.get()
                    .uri(url)
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofSeconds(10))
                    .block();
            if (body == null) throw new TwoFactorException("Empty response from 2Factor");
            JsonNode n = mapper.readTree(body);
            String status = n.path("Status").asText("");
            return "Success".equalsIgnoreCase(status);
        } catch (WebClientResponseException e) {
            log.warn("2Factor verifyOtp http error: {}", e.getStatusCode());
            throw new TwoFactorException("2Factor HTTP error", e);
        } catch (Exception e) {
            throw new TwoFactorException("2Factor verifyOtp error", e);
        }
    }

    private void ensureApiKey() throws TwoFactorException {
        if (props.getApiKey() == null || props.getApiKey().isBlank()) {
            throw new TwoFactorException("2Factor API key not configured");
        }
    }
}
