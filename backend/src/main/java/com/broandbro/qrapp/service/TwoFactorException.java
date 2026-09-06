package com.broandbro.qrapp.service;

public class TwoFactorException extends Exception {
    public TwoFactorException(String message) { super(message); }
    public TwoFactorException(String message, Throwable cause) { super(message, cause); }
}
