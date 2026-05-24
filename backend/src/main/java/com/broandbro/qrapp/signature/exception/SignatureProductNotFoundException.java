package com.broandbro.qrapp.signature.exception;

public class SignatureProductNotFoundException extends RuntimeException {
    public SignatureProductNotFoundException(Long id) {
        super("Signature product not found with id: " + id);
    }
    public SignatureProductNotFoundException(String message) {
        super(message);
    }
}

