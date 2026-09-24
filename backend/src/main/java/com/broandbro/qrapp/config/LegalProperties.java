package com.broandbro.qrapp.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "legal")
@Getter
@Setter
public class LegalProperties {
    private String termsVersion = "2026-09";
    private String privacyPolicyVersion = "2026-01";
}
