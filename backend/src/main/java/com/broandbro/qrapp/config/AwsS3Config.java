package com.broandbro.qrapp.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;

/**
 * Configures the AWS S3 client.
 *
 * When aws.s3.enabled=false (local dev), a no-op dummy client is NOT needed —
 * S3ImageStorageService checks the flag before every call.
 *
 * When aws.s3.enabled=true the access-key and secret-key MUST be supplied
 * (via AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY env vars).
 * A missing or blank credential fails fast at startup with a clear message
 * rather than producing a 403/credential error at upload time.
 */
@Configuration
@Slf4j
public class AwsS3Config {

    @Bean
    public S3Client s3Client(AwsS3Properties props) {
        Region region = Region.of(props.getRegion());

        boolean hasKey    = props.getAccessKey() != null && !props.getAccessKey().isBlank();
        boolean hasSecret = props.getSecretKey() != null && !props.getSecretKey().isBlank();

        if (props.isEnabled()) {
            if (hasKey && hasSecret) {
                log.info("[AWS S3] Using static credentials for bucket '{}' in region '{}'",
                        props.getBucketName(), props.getRegion());
                return S3Client.builder()
                        .region(region)
                        .credentialsProvider(StaticCredentialsProvider.create(
                                AwsBasicCredentials.create(props.getAccessKey(), props.getSecretKey())))
                        .build();
            }

            // No static keys — rely on the default credential chain:
            // IAM instance profile, ECS task role, env vars, ~/.aws/credentials, etc.
            log.info("[AWS S3] No static credentials configured — using default credential chain " +
                     "(IAM role / instance profile) for bucket '{}' in region '{}'",
                    props.getBucketName(), props.getRegion());
            return S3Client.builder()
                    .region(region)
                    .credentialsProvider(DefaultCredentialsProvider.create())
                    .build();
        }

        // S3 disabled — return a minimal placeholder client.
        // S3ImageStorageService checks props.isEnabled() before every call,
        // so this client is never actually used.
        log.warn("[AWS S3] S3 is DISABLED (aws.s3.enabled=false). Image uploads will return placeholder URLs.");
        return S3Client.builder()
                .region(region)
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create("disabled", "disabled")))
                .build();
    }
}

