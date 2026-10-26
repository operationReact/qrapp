package com.broandbro.qrapp.exception;

import org.springframework.http.HttpStatus;

public class AccountDeletionException extends RuntimeException {
    private final String code;
    private final HttpStatus status;

    public AccountDeletionException(String code, HttpStatus status) {
        super(code);
        this.code = code;
        this.status = status;
    }

    public String getCode() {
        return code;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
