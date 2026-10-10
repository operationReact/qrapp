package com.broandbro.qrapp.partnerfinance.enums;

public enum AdjustmentType {
    MANUAL_CREDIT(1),
    MANUAL_DEBIT(-1),
    REFUND_ADJUSTMENT(-1);

    private final int sign;

    AdjustmentType(int sign) {
        this.sign = sign;
    }

    public int sign() {
        return sign;
    }
}