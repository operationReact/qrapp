package com.broandbro.qrapp.promotion.exception;

public class PromotionNotFoundException extends RuntimeException {
    public PromotionNotFoundException(String code) {
        super("No promotion found with code: " + code);
    }
}

