package com.broandbro.qrapp.promotion.exception;

import java.math.BigDecimal;

public class PromotionIneligibleException extends RuntimeException {
    private final BigDecimal missingAmount;

    public PromotionIneligibleException(String reason) {
        super(reason);
        this.missingAmount = null;
    }

    public PromotionIneligibleException(String reason, BigDecimal missingAmount) {
        super(reason);
        this.missingAmount = missingAmount;
    }

    public BigDecimal getMissingAmount() {
        return missingAmount;
    }
}

