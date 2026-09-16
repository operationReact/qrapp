package com.broandbro.qrapp.whatsapp;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(WhatsAppWebhookProperties.class)
public class WhatsAppWebhookConfiguration {
}
