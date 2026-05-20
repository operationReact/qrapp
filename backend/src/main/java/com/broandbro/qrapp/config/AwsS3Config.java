package com.broandbro.qrapp.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;

/**
 * Configures the AWS S3 client.
 * Uses explicit credentials when provided; falls back to the
 * DefaultCredentialsProvider chain (IAM role / env vars / ~/.aws/credentials).
 */
@Configuration
public class AwsS3Config {

    @Bean
    public S3Client s3Client(AwsS3Properties props) {
        Region region = Region.of(props.getRegion());

        if (props.getAccessKey() != null && !props.getAccessKey().isBlank()
                && props.getSecretKey() != null && !props.getSecretKey().isBlank()) {

            AwsBasicCredentials credentials =
                    AwsBasicCredentials.create(props.getAccessKey(), props.getSecretKey());

            return S3Client.builder()
                    .region(region)
                    .credentialsProvider(StaticCredentialsProvider.create(credentials))
                    .build();
        }

        // Fallback: use IAM role / environment-provided credentials
        return S3Client.builder()
                .region(region)
                .credentialsProvider(DefaultCredentialsProvider.create())
                .build();
    }
}

