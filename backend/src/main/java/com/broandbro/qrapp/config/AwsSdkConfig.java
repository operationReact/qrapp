package com.broandbro.qrapp.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.services.ssm.SsmClient;

/**
 * AWS SDK Bean Configuration
 */
@Configuration
public class AwsSdkConfig {

    /**
     * Create SSM client for Parameter Store operations
     */
    @Bean
    public SsmClient ssmClient() {
        return SsmClient.builder().build();
    }
}

