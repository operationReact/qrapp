package com.broandbro.qrapp.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Parameter definitions that are automatically synced to AWS Parameter Store.
 *
 * Define all parameters here in application.yml and they will be created/updated
 * automatically when the application starts.
 *
 * Example in application.yml:
 * app:
 *   parameter-store:
 *     auto-create: true  # Enable auto-creation
 *     environment: dev
 *   parameters:
 *     database:
 *       url: jdbc:postgresql://...
 *       username: user
 *       password: pass
 *     razorpay:
 *       key: ...
 */
@Component
@ConfigurationProperties(prefix = "app.parameters")
@Data
public class ParameterStoreDefinitions {

    private DatabaseConfig database;
    private RazorpayConfig razorpay;
    private AwsConfig aws;
    private OpenaiConfig openai;
    private AppConfig app;

    @Data
    public static class DatabaseConfig {
        private String url;
        private String username;
        private String password;
    }

    @Data
    public static class RazorpayConfig {
        private String key;
        private String secret;
        private String webhookSecret;
    }

    @Data
    public static class AwsConfig {
        private S3Config s3;

        @Data
        public static class S3Config {
            private boolean enabled;
            private String bucketName;
            private String region;
            private String accessKey;
            private String secretKey;
        }
    }

    @Data
    public static class OpenaiConfig {
        private String apiKey;
    }

    @Data
    public static class AppConfig {
        private String corsAllowedOrigins;
    }
}
