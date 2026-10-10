package com.broandbro.qrapp.manualinvoice.exception;

import org.springframework.http.HttpStatus;

/** Business failure for the manual invoice module, carrying the HTTP status to surface. */
public class ManualInvoiceException extends RuntimeException {
    private final HttpStatus status;

    private ManualInvoiceException(HttpStatus status, String code) {
        super(code);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }

    public String getCode() {
        return getMessage();
    }

    public static ManualInvoiceException validation(String code) {
        return new ManualInvoiceException(HttpStatus.BAD_REQUEST, code);
    }

    public static ManualInvoiceException notFound(String code) {
        return new ManualInvoiceException(HttpStatus.NOT_FOUND, code);
    }

    public static ManualInvoiceException conflict(String code) {
        return new ManualInvoiceException(HttpStatus.CONFLICT, code);
    }
}
