package com.broandbro.qrapp.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Loads 2Factor configuration from environment/parameter store.
 * The API key must be provided via environment variable TWO_FACTOR_API_KEY or SSM.
 */
@Component
public class TwoFactorProperties {

    @Value("${TWO_FACTOR_API_KEY:}")
    private String apiKey;

    /** Base URL for 2Factor API. Kept configurable in case it changes. */
    @Value("${TWO_FACTOR_BASE_URL:https://2factor.in/API/V1}")
    private String baseUrl;

    public String getApiKey() {
        return apiKey;
    }

    public String getBaseUrl() {
        return baseUrl;
    }
}
