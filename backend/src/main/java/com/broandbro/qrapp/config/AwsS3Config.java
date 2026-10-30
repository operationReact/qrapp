package com.broandbro.qrapp.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AnonymousCredentialsProvider;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;

/**
 * Configures the AWS S3 client.
 *
 * Security rule: application code never consumes long-lived static AWS access
 * keys from configuration. When S3 is enabled, the AWS SDK default credential
 * chain is used (EC2 instance profile, ECS task role, environment/credential
 * process for local development, etc.).
 */
@Configuration
@Slf4j
public class AwsS3Config {

    @Bean
    public S3Client s3Client(AwsS3Properties props) {
        Region region = Region.of(props.getRegion());

        if (props.isEnabled()) {
            log.info("[AWS S3] Using AWS default credential chain (IAM role / temporary credentials) " +
                    "for bucket '{}' in region '{}'",
                    props.getBucketName(), props.getRegion());
            return S3Client.builder()
                    .region(region)
                    .credentialsProvider(DefaultCredentialsProvider.create())
                    .build();
        }

        // S3ImageStorageService checks props.isEnabled() before making S3 calls.
        log.warn("[AWS S3] S3 is DISABLED (aws.s3.enabled=false). Image uploads will return placeholder URLs.");
        return S3Client.builder()
                .region(region)
                .credentialsProvider(AnonymousCredentialsProvider.create())
                .build();
    }
}
