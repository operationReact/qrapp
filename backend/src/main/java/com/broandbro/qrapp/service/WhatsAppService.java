package com.broandbro.qrapp.service;

import com.broandbro.qrapp.config.TwilioProperties;
import com.twilio.Twilio;
import com.twilio.rest.api.v2010.account.Message;
import com.twilio.rest.api.v2010.account.MessageCreator;
import com.twilio.type.PhoneNumber;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.Random;

@Service
public class WhatsAppService {

    private static final Logger log = LoggerFactory.getLogger(WhatsAppService.class);

    private final TwilioProperties twilioProperties;
    private final boolean enabled;
    private final Cache otpCache;
    private final Random random = new Random();

    public WhatsAppService(TwilioProperties twilioProperties, CacheManager cacheManager) {
        this.twilioProperties = twilioProperties;
        this.otpCache = cacheManager.getCache("otp");
        boolean hasAccountSid = StringUtils.hasText(twilioProperties.getAccountSid());
        boolean hasAuthToken = StringUtils.hasText(twilioProperties.getAuthToken());
        this.enabled = hasAccountSid && hasAuthToken;
        if (this.enabled) {
            Twilio.init(twilioProperties.getAccountSid(), twilioProperties.getAuthToken());
            log.info("Twilio initialized for WhatsApp messaging");
        } else {
            log.warn("Twilio credentials not configured, WhatsApp messaging disabled");
        }
    }



    public void sendOtp(String phone, String userName) {
        if (!enabled || !StringUtils.hasText(twilioProperties.getOtpContentSid())) {
            log.debug("WhatsApp messaging disabled or OTP content SID not configured");
            return;
        }
        String otp = String.format("%06d", random.nextInt(1000000));
        try {
            String toNumber = "whatsapp:" + phone;
            // Format content variables as JSON with numeric keys: {"1":"value1","2":"value2",...}
            String contentVariables = String.format("{\"%d\":\"%s\"}", 1, otp);

            MessageCreator creator = Message.creator(
                    new PhoneNumber(toNumber),
                    new PhoneNumber(twilioProperties.getFromNumber()),
                    ""
            );

            creator.setContentSid(twilioProperties.getOtpContentSid());
            creator.setContentVariables(contentVariables);

            Message message = creator.create();

            // Store OTP in cache
            otpCache.put(phone, otp);
            log.info("Sent WhatsApp OTP to {} for user {}, SID: {}", phone, userName, message.getSid());
        } catch (Exception e) {
            log.error("Failed to send WhatsApp OTP to {} for user {}", phone, userName, e);
        }
    }

    public boolean verifyOtp(String phone, String otp) {
        Cache.ValueWrapper wrapper = otpCache.get(phone);
        if (wrapper == null) {
            return false;
        }
        String cachedOtp = String.valueOf(wrapper.get()).trim();
        return otp.trim().equals(cachedOtp);
    }
}