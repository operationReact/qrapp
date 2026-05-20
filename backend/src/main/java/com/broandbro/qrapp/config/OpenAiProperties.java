package com.broandbro.qrapp.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.validation.annotation.Validated;

/**
 * Binds openai.* keys from application.yml.
 * API key is always sourced from environment variable OPENAI_API_KEY.
 */
@Component
@ConfigurationProperties(prefix = "openai")
@Data
@Validated
public class OpenAiProperties {

    /** OpenAI API key – injected from OPENAI_API_KEY env var. Never hardcode. */
    private String apiKey;

    /** Model identifier for image generation. */
    private String imageModel = "gpt-image-1";

    /** Base URL for OpenAI REST API. */
    private String baseUrl = "https://api.openai.com/v1";

    /** Image dimensions. */
    private String imageSize = "1024x1024";

    /** WebClient connect timeout in milliseconds. */
    private int connectTimeoutMs = 5000;

    /** WebClient read timeout in seconds (image gen can be slow). */
    private int readTimeoutSeconds = 120;

    /** Maximum number of retry attempts on transient failures. */
    private int maxRetries = 3;
}
