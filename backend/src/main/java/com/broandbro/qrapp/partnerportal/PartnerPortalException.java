package com.broandbro.qrapp.partnerportal;

import org.springframework.http.HttpStatus;

/** Business-rule failure for partner portal APIs (reports, notifications); the message is a stable code. */
public class PartnerPortalException extends RuntimeException {
    private final HttpStatus status;

    private PartnerPortalException(HttpStatus status, String code) {
        super(code);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }

    public String getCode() {
        return getMessage();
    }

    public static PartnerPortalException validation(String code) {
        return new PartnerPortalException(HttpStatus.BAD_REQUEST, code);
    }

    public static PartnerPortalException notFound(String code) {
        return new PartnerPortalException(HttpStatus.NOT_FOUND, code);
    }

    public static PartnerPortalException unavailable(String code) {
        return new PartnerPortalException(HttpStatus.UNPROCESSABLE_ENTITY, code);
    }
}
