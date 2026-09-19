package com.broandbro.qrapp.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;

/**
 * Loads application configuration from AWS Parameter Store
 * Parameter path: /broandbro/backend/{environment}/{section}/{key}
 *
 * Example parameters:
 *   /broandbro/backend/dev/database/url
 *   /broandbro/backend/dev/database/username
 *   /broandbro/backend/dev/database/password
 *   /broandbro/backend/dev/razorpay/key
 *   /broandbro/backend/dev/razorpay/secret
 *   /broandbro/backend/dev/aws/s3/accessKey
 *   /broandbro/backend/dev/app/cors/allowedOrigins
 */
@Configuration
@Data
@Slf4j
public class ParameterStoreConfig {

    // ──────────────────────────────────────────────────────────────────────────
    // Database Configuration
    // ──────────────────────────────────────────────────────────────────────────

    @Value("${app.parameter-store.database.url:#{null}}")
    private String databaseUrl;

    @Value("${app.parameter-store.database.username:#{null}}")
    private String databaseUsername;

    @Value("${app.parameter-store.database.password:#{null}}")
    private String databasePassword;

    // ──────────────────────────────────────────────────────────────────────────
    // Razorpay Configuration
    // ──────────────────────────────────────────────────────────────────────────

    @Value("${app.parameter-store.razorpay.key:#{null}}")
    private String razorpayKey;

    @Value("${app.parameter-store.razorpay.secret:#{null}}")
    private String razorpaySecret;

    @Value("${app.parameter-store.razorpay.webhookSecret:#{null}}")
    private String razorpayWebhookSecret;

    // ──────────────────────────────────────────────────────────────────────────
    // AWS S3 Configuration
    // ──────────────────────────────────────────────────────────────────────────

    @Value("${app.parameter-store.aws.s3.enabled:#{null}}")
    private String s3Enabled;

    @Value("${app.parameter-store.aws.s3.bucketName:#{null}}")
    private String s3BucketName;

    @Value("${app.parameter-store.aws.s3.region:#{null}}")
    private String s3Region;

    @Value("${app.parameter-store.aws.s3.accessKey:#{null}}")
    private String s3AccessKey;

    @Value("${app.parameter-store.aws.s3.secretKey:#{null}}")
    private String s3SecretKey;

    // ──────────────────────────────────────────────────────────────────────────
    // ──────────────────────────────────────────────────────────────────────────
    // OpenAI Configuration
    // ──────────────────────────────────────────────────────────────────────────

    @Value("${app.parameter-store.openai.apiKey:#{null}}")
    private String openaiApiKey;

    // ──────────────────────────────────────────────────────────────────────────
    // Application Configuration
    // ──────────────────────────────────────────────────────────────────────────

    @Value("${app.parameter-store.app.cors.allowedOrigins:#{null}}")
    private String corsAllowedOrigins;

    // ──────────────────────────────────────────────────────────────────────────
    // Log Configuration Status
    // ──────────────────────────────────────────────────────────────────────────

    public void logConfigurationStatus() {
        log.info("════════════════════════════════════════════════════════════════");
        log.info("AWS Parameter Store Configuration Status");
        log.info("════════════════════════════════════════════════════════════════");

        log.info("Database URL: {}", databaseUrl != null ? "✅ LOADED" : "❌ NOT FOUND");
        log.info("Database Username: {}", databaseUsername != null ? "✅ LOADED" : "❌ NOT FOUND");
        log.info("Database Password: {}", databasePassword != null ? "✅ LOADED" : "❌ NOT FOUND");

        log.info("Razorpay Key: {}", razorpayKey != null ? "✅ LOADED" : "❌ NOT FOUND");
        log.info("Razorpay Secret: {}", razorpaySecret != null ? "✅ LOADED" : "❌ NOT FOUND");

        log.info("S3 Enabled: {}", s3Enabled != null ? "✅ LOADED" : "❌ NOT FOUND");
        log.info("S3 Bucket: {}", s3BucketName != null ? "✅ LOADED" : "❌ NOT FOUND");

        log.info("OpenAI API Key: {}", openaiApiKey != null ? "✅ LOADED" : "❌ NOT FOUND");

        log.info("CORS Origins: {}", corsAllowedOrigins != null ? "✅ LOADED" : "❌ NOT FOUND");
        log.info("════════════════════════════════════════════════════════════════");
    }
}
