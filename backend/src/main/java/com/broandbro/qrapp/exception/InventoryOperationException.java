package com.broandbro.qrapp.exception;

/**
 * General inventory operation exception.
 */
public class InventoryOperationException extends RuntimeException {
    public InventoryOperationException(String message) {
        super(message);
    }

    public InventoryOperationException(String message, Throwable cause) {
        super(message, cause);
    }
}

