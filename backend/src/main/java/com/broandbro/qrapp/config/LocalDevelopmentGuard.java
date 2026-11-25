package com.broandbro.qrapp.config;

import java.util.Arrays;
import java.util.Set;
import org.springframework.context.ApplicationContextInitializer;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.core.env.Environment;

/** Refuse accidental production connections before datasource or Flyway initialization. */
public final class LocalDevelopmentGuard implements ApplicationContextInitializer<ConfigurableApplicationContext> {
    private static final Set<String> ALLOWED_URLS = Set.of(
            "jdbc:postgresql://localhost:5432/broandbro_local",
            "jdbc:postgresql://127.0.0.1:5432/broandbro_local");

    @Override
    public void initialize(ConfigurableApplicationContext context) {
        validate(context.getEnvironment());
    }

    static void validate(Environment env) {
        var profiles = Arrays.asList(env.getActiveProfiles());
        if (!profiles.contains("local")) return;
        if (profiles.size() != 1) {
            throw new IllegalStateException("The local profile must run alone.");
        }
        if (!ALLOWED_URLS.contains(env.getProperty("spring.datasource.url", ""))) {
            throw new IllegalStateException("Local development requires the dedicated loopback broandbro_local database.");
        }
        for (String key : new String[]{"spring.cloud.aws.parameterstore.enabled",
                "app.parameter-store.auto-create", "aws.s3.enabled", "whatsapp.enabled",
                "product.ai-image.enabled"}) {
            if (env.getProperty(key, Boolean.class, true)) {
                throw new IllegalStateException("Local development requires " + key + "=false");
            }
        }
        for (String key : new String[]{"razorpay.key", "razorpay.secret", "razorpay.webhookSecret",
                "openai.api-key", "whatsapp.access-token", "whatsapp.phone-number-id"}) {
            if (!env.getProperty(key, "").isBlank()) {
                throw new IllegalStateException("External provider credentials are not allowed in local mode: " + key);
            }
        }
        if (!"127.0.0.1".equals(env.getProperty("server.address"))) {
            throw new IllegalStateException("Local backend must bind to 127.0.0.1.");
        }
    }
}
