package com.broandbro.qrapp.exception;

/**
 * Thrown when a generated prompt is invalid or fails security/content checks.
 */
public class InvalidPromptException extends RuntimeException {

    public InvalidPromptException(String message) {
        super(message);
    }
}

