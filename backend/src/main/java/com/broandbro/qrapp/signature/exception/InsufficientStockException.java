package com.broandbro.qrapp.signature.exception;

public class InsufficientStockException extends RuntimeException {
    public InsufficientStockException(Long productId, int requested, int available) {
        super(String.format("Insufficient stock for product %d: requested=%d, available=%d",
                productId, requested, available));
    }
    public InsufficientStockException(String message) {
        super(message);
    }
}

