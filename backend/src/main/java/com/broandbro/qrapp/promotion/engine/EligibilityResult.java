package com.broandbro.qrapp.promotion.engine;

import com.broandbro.qrapp.promotion.entity.Promotion;

import java.math.BigDecimal;

public record EligibilityResult(
        Promotion promotion,
        boolean eligible,
        BigDecimal discount,
        String failureReason,
        BigDecimal missingAmount  // non-null for MIN_ORDER_AMOUNT failures
) {
    public static EligibilityResult eligible(Promotion p, BigDecimal discount) {
        return new EligibilityResult(p, true, discount, null, null);
    }

    public static EligibilityResult ineligible(Promotion p, String reason) {
        return new EligibilityResult(p, false, BigDecimal.ZERO, reason, null);
    }

    public static EligibilityResult ineligible(Promotion p, String reason, BigDecimal missingAmount) {
        return new EligibilityResult(p, false, BigDecimal.ZERO, reason, missingAmount);
    }
}

