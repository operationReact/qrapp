package com.broandbro.qrapp.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "whatsapp")
@Getter
@Setter
public class WhatsAppOtpProperties {
    private boolean enabled = false;
    private String phoneNumberId;
    private String accessToken;
    private String verificationTemplateName = "bro_bro_verification_code";
    private String verificationTemplateLanguage = "en";
    private GraphApi graphApi = new GraphApi();
    private Otp otp = new Otp();

    @Getter
    @Setter
    public static class GraphApi {
        private String version = "v23.0";
        private String baseUrl = "https://graph.facebook.com";
        private int timeoutSeconds = 10;
    }

    @Getter
    @Setter
    public static class Otp {
        private int expiryMinutes = 5;
        private int maxAttempts = 5;
        private int resendCooldownSeconds = 60;
        private int maxRequestsPerHour = 5;
        private int resetAuthorizationMinutes = 10;
    }
}
