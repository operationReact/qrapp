package com.broandbro.qrapp.exception;

public class ImageNotFoundException extends RuntimeException {
    public ImageNotFoundException(String message) {
        super(message);
    }
    public ImageNotFoundException(Long id) {
        super("Image not found with id: " + id);
    }
}

