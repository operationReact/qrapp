package com.broandbro.qrapp.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "twilio")
@Getter
@Setter
public class TwilioProperties {

    private String accountSid;
    private String authToken;
    private String fromNumber;
    private String orderPlacedContentSid;
    private String orderReadyContentSid;
    private String otpContentSid;

}

