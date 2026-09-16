package com.broandbro.qrapp.whatsapp;

import org.junit.jupiter.api.Test;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;

import static org.junit.jupiter.api.Assertions.*;

class WhatsAppWebhookSignatureValidatorTest {

    private final WhatsAppWebhookSignatureValidator validator =
            new WhatsAppWebhookSignatureValidator(            new WhatsAppWebhookProperties("verify-token", "app-secret"));

    @Test
    void acceptsSignatureForExactRawBody() throws Exception {
        byte[] body = "{\"a\": 1}".getBytes(StandardCharsets.UTF_8);

        assertTrue(validator.isValid(body, "sha256=" + digest(body)));
    }

    @Test
    void rejectsChangedBody() throws Exception {
        byte[] signedBody = "{\"a\": 1}".getBytes(StandardCharsets.UTF_8);
        byte[] changedBody = "{\"a\":1}".getBytes(StandardCharsets.UTF_8);

        assertFalse(validator.isValid(changedBody, "sha256=" + digest(signedBody)));
    }

    @Test
    void rejectsMissingAndMalformedSignatures() {
        byte[] body = "{}".getBytes(StandardCharsets.UTF_8);

        assertFalse(validator.isValid(body, null));
        assertFalse(validator.isValid(body, ""));
        assertFalse(validator.isValid(body, "sha1=not-a-digest"));
        assertFalse(validator.isValid(body, "sha256=invalid"));
    }

    private String digest(byte[] body) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(
                "app-secret".getBytes(StandardCharsets.UTF_8),
                "HmacSHA256"
        ));
        return HexFormat.of().formatHex(mac.doFinal(body));
    }
}
