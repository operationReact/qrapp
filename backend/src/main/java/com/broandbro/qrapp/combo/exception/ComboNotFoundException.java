package com.broandbro.qrapp.combo.exception;

public class ComboNotFoundException extends RuntimeException {
    public ComboNotFoundException(Long id) {
        super("Combo not found with id: " + id);
    }
    public ComboNotFoundException(String message) {
        super(message);
    }
}

