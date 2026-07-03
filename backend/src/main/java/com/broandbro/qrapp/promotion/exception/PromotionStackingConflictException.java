package com.broandbro.qrapp.promotion.exception;

public class PromotionStackingConflictException extends RuntimeException {
    public PromotionStackingConflictException(String reason) {
        super(reason);
    }
}

