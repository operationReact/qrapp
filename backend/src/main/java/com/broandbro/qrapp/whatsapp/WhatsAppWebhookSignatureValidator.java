package com.broandbro.qrapp.whatsapp;

import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.regex.Pattern;

@Service
public class WhatsAppWebhookSignatureValidator {

    private static final String SIGNATURE_PREFIX = "sha256=";
    private static final Pattern HEX_DIGEST = Pattern.compile("[0-9a-fA-F]{64}");

    private final WhatsAppWebhookProperties properties;

    public WhatsAppWebhookSignatureValidator(WhatsAppWebhookProperties properties) {
        this.properties = properties;
    }

    public boolean isValid(byte[] rawBody, String signature) {
        if (rawBody == null || rawBody.length == 0
                || !StringUtils.hasText(signature)
                || !StringUtils.hasText(properties.appSecret())) {
            return false;
        }

        String supplied = signature.trim();
        if (!supplied.startsWith(SIGNATURE_PREFIX)) {
            return false;
        }

        String suppliedDigest = supplied.substring(SIGNATURE_PREFIX.length());
        if (!HEX_DIGEST.matcher(suppliedDigest).matches()) {
            return false;
        }

        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(
                    properties.appSecret().getBytes(StandardCharsets.UTF_8),
                    "HmacSHA256"
            ));
            byte[] expectedDigest = mac.doFinal(rawBody);
            byte[] actualDigest = HexFormat.of().parseHex(suppliedDigest);
            return MessageDigest.isEqual(expectedDigest, actualDigest);
        } catch (Exception ex) {
            return false;
        }
    }
}
