package com.broandbro.qrapp.service;

import java.math.BigDecimal;
import java.math.RoundingMode;

public final class MoneyService {
    public static final int SCALE = 2;
    public static final RoundingMode ROUNDING = RoundingMode.HALF_UP;

    private MoneyService() {
    }

    public static BigDecimal amount(BigDecimal value) {
        return (value == null ? BigDecimal.ZERO : value).setScale(SCALE, ROUNDING);
    }

    public static BigDecimal multiply(BigDecimal left, BigDecimal right) {
        return amount((left == null ? BigDecimal.ZERO : left)
                .multiply(right == null ? BigDecimal.ZERO : right));
    }

    public static BigDecimal percentage(BigDecimal amount, BigDecimal rate) {
        BigDecimal base = amount == null ? BigDecimal.ZERO : amount;
        BigDecimal percent = rate == null ? BigDecimal.ZERO : rate;
        return amount(base.multiply(percent).divide(BigDecimal.valueOf(100), 8, ROUNDING));
    }
}
