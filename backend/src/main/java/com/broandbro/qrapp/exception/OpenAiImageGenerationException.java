package com.broandbro.qrapp.exception;

/**
 * Thrown when the OpenAI Images API returns an error or cannot be reached.
 */
public class OpenAiImageGenerationException extends RuntimeException {

    public OpenAiImageGenerationException(String message) {
        super(message);
    }

    public OpenAiImageGenerationException(String message, Throwable cause) {
        super(message, cause);
    }
}

