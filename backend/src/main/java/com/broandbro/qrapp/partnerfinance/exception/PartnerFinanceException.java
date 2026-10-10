package com.broandbro.qrapp.partnerfinance.exception;

import org.springframework.http.HttpStatus;

public class PartnerFinanceException extends RuntimeException {
    private final HttpStatus status;

    private PartnerFinanceException(HttpStatus status, String code) {
        super(code);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }

    public String getCode() {
        return getMessage();
    }

    public static PartnerFinanceException validation(String code) {
        return new PartnerFinanceException(HttpStatus.BAD_REQUEST, code);
    }

    public static PartnerFinanceException notFound(String code) {
        return new PartnerFinanceException(HttpStatus.NOT_FOUND, code);
    }

    public static PartnerFinanceException conflict(String code) {
        return new PartnerFinanceException(HttpStatus.CONFLICT, code);
    }

    public static PartnerFinanceException forbidden(String code) {
        return new PartnerFinanceException(HttpStatus.FORBIDDEN, code);
    }
}