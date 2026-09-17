package com.broandbro.qrapp.exception;

import lombok.Getter;

@Getter
public class WhatsAppDeliveryException extends RuntimeException {
    private final int statusCode;
    private final String metaErrorCode;

    public WhatsAppDeliveryException(int statusCode, String metaErrorCode) {
        super("WhatsApp OTP delivery failed");
        this.statusCode = statusCode;
        this.metaErrorCode = metaErrorCode;
    }

    public WhatsAppDeliveryException(String message, Throwable cause) {
        super(message, cause);
        this.statusCode = 0;
        this.metaErrorCode = null;
    }
}
