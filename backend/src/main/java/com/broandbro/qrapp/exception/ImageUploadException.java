package com.broandbro.qrapp.exception;

/**
 * Thrown when an image cannot be uploaded to the storage backend (S3).
 */
public class ImageUploadException extends RuntimeException {

    public ImageUploadException(String message) {
        super(message);
    }

    public ImageUploadException(String message, Throwable cause) {
        super(message, cause);
    }
}

