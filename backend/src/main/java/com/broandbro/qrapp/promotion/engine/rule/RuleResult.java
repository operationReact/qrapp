package com.broandbro.qrapp.promotion.engine.rule;

import java.math.BigDecimal;

public record RuleResult(
        boolean passed,
        String failureReason,
        BigDecimal missingAmount
) {
    public static RuleResult pass() {
        return new RuleResult(true, null, null);
    }

    public static RuleResult fail(String reason) {
        return new RuleResult(false, reason, null);
    }

    public static RuleResult failWithGap(String reason, BigDecimal gap) {
        return new RuleResult(false, reason, gap);
    }
}

