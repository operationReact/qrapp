package com.broandbro.qrapp.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import software.amazon.awssdk.services.ssm.SsmClient;

/**
 * AWS SDK Bean Configuration
 */
@Configuration
@Profile("!local")
public class AwsSdkConfig {

    /**
     * Create SSM client for Parameter Store operations
     */
    @Bean
    public SsmClient ssmClient() {
        return SsmClient.builder().build();
    }
}

