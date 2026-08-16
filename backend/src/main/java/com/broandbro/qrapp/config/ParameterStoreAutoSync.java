package com.broandbro.qrapp.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.event.ContextRefreshedEvent;
import org.springframework.context.event.EventListener;
import software.amazon.awssdk.services.ssm.SsmClient;
import software.amazon.awssdk.services.ssm.model.*;

/**
 * Auto-creates AWS Parameter Store parameters on application startup.
 *
 * Parameters are defined in application.yml under 'app.parameters'
 * Enable with: app.parameter-store.auto-create=true
 */
@Configuration
@Slf4j
@ConditionalOnProperty(name = "app.parameter-store.auto-create", havingValue = "true")
class ParameterStoreInitializer {

    @Value("${app.parameter-store.environment:dev}")
    private String environment;

    @Value("${aws.region:us-east-1}")
    private String awsRegion;

    private final ParameterStoreDefinitions definitions;
    private final SsmClient ssmClient;

    public ParameterStoreInitializer(ParameterStoreDefinitions definitions, SsmClient ssmClient) {
        this.definitions = definitions;
        this.ssmClient = ssmClient;
    }

    /**
     * Initialize parameters after application context is refreshed
     */
    @EventListener(ContextRefreshedEvent.class)
    public void initializeParameters() {
        log.info("════════════════════════════════════════════════════════════════");
        log.info("🔄 Syncing Parameters to AWS Parameter Store");
        log.info("Environment: {} | Region: {}", environment, awsRegion);
        log.info("════════════════════════════════════════════════════════════════");

        try {
            int count = 0;

            // Database
            if (definitions.getDatabase() != null) {
                count += syncParameter("database/url",
                    definitions.getDatabase().getUrl(), "String");
                count += syncParameter("database/username",
                    definitions.getDatabase().getUsername(), "String");
                count += syncParameter("database/password",
                    definitions.getDatabase().getPassword(), "SecureString");
            }

            // Razorpay
            if (definitions.getRazorpay() != null) {
                count += syncParameter("razorpay/key",
                    definitions.getRazorpay().getKey(), "SecureString");
                count += syncParameter("razorpay/secret",
                    definitions.getRazorpay().getSecret(), "SecureString");
                count += syncParameter("razorpay/webhookSecret",
                    definitions.getRazorpay().getWebhookSecret(), "SecureString");
            }

            // AWS S3
            if (definitions.getAws() != null && definitions.getAws().getS3() != null) {
                var s3 = definitions.getAws().getS3();
                count += syncParameter("aws/s3/enabled",
                    String.valueOf(s3.isEnabled()), "String");
                count += syncParameter("aws/s3/bucketName",
                    s3.getBucketName(), "String");
                count += syncParameter("aws/s3/region",
                    s3.getRegion(), "String");
                count += syncParameter("aws/s3/accessKey",
                    s3.getAccessKey(), "SecureString");
                count += syncParameter("aws/s3/secretKey",
                    s3.getSecretKey(), "SecureString");
            }

            // Twilio
            if (definitions.getTwilio() != null) {
                count += syncParameter("twilio/accountSid",
                    definitions.getTwilio().getAccountSid(), "String");
                count += syncParameter("twilio/authToken",
                    definitions.getTwilio().getAuthToken(), "SecureString");
            }

            // OpenAI
            if (definitions.getOpenai() != null) {
                count += syncParameter("openai/apiKey",
                    definitions.getOpenai().getApiKey(), "SecureString");
            }

            // Application
            if (definitions.getApp() != null) {
                count += syncParameter("app/cors/allowedOrigins",
                    definitions.getApp().getCorsAllowedOrigins(), "String");
            }

            log.info("════════════════════════════════════════════════════════════════");
            log.info("✅ Parameter Store Sync Complete! ({} parameters)", count);
            log.info("════════════════════════════════════════════════════════════════");

        } catch (Exception e) {
            log.error("❌ Error syncing parameters to Parameter Store", e);
        }
    }

    /**
     * Sync a single parameter to AWS Parameter Store
     */
    private int syncParameter(String key, String value, String type) {
        if (value == null || value.isBlank()) {
            return 0;
        }

        try {
            String paramName = String.format("/broandbro/backend/%s/%s", environment, key);

            ssmClient.putParameter(PutParameterRequest.builder()
                .name(paramName)
                .value(value)
                .type(ParameterType.fromValue(type))
                .overwrite(true)
                .tags(Tag.builder().key("Environment").value(environment).build())
                .build());

            log.info("  ✅ {}", paramName);
            return 1;

        } catch (Exception e) {
            log.warn("  ⚠️  Failed to sync parameter {}: {}", key, e.getMessage());
            return 0;
        }
    }
}

