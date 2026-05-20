package com.broandbro.qrapp.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.validation.annotation.Validated;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;

/**
 * Binds openai.* keys from application.yml.
 * API key is always sourced from environment variable OPENAI_API_KEY.
 */
@Component
@ConfigurationProperties(prefix = "openai")
@Data
@Validated
public class OpenAiProperties {

    /**
     * OpenAI API key – injected from environment variable OPENAI_API_KEY.
     * Never hardcode this value.
     */
    private String apiKey;

    /** Model identifier for image generation (e.g. gpt-image-1, dall-e-3). */
    private String imageModel = "gpt-image-1";

    /** Base URL for OpenAI REST API. */
    private String baseUrl = "https://api.openai.com/v1";

    /** Image dimensions. */
    private String imageSize = "1024x1024";

    /** WebClient connect timeout in milliseconds. */
    private int connectTimeoutMs = 5000;

    /** WebClient read timeout in seconds. */
    private int readTimeoutSeconds = 60;

    /** Maximum number of retry attempts on transient failures. */
    private int maxRetries = 3;
}

