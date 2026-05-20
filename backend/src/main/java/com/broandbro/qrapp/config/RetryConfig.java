package com.broandbro.qrapp.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.retry.annotation.EnableRetry;

/**
 * Enables Spring Retry support across the application.
 * Used primarily by OpenAiImageService for transient failure handling.
 */
@Configuration
@EnableRetry
public class RetryConfig {
}

