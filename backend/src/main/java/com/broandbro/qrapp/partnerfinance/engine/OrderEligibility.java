package com.broandbro.qrapp.partnerfinance.engine;

import com.broandbro.qrapp.enums.PaymentMethod;

/**
 * Eligibility for commission bases that require it. Mirrors the kitchen-queue payment semantics:
 * PAID, or PENDING for pay-at-stall / wallet orders. Pre-orders are never eligible.
 */
public final class OrderEligibility {
    public static final String PRE_ORDER = "PRE_ORDER";
    public static final String PAYMENT_NOT_SETTLED = "PAYMENT_NOT_SETTLED";

    private OrderEligibility() {
    }

    /** @return null when eligible, otherwise the exclusion reason code */
    public static String exclusionReason(boolean preOrder, String paymentStatus, PaymentMethod paymentMethod) {
        if (preOrder) {
            return PRE_ORDER;
        }
        String status = paymentStatus == null ? "" : paymentStatus.trim().toUpperCase();
        if (status.equals("PAID")) {
            return null;
        }
        boolean payLater = paymentMethod == PaymentMethod.PAY_AT_STALL || paymentMethod == PaymentMethod.WALLET;
        if (status.equals("PENDING") && payLater) {
            return null;
        }
        return PAYMENT_NOT_SETTLED;
    }
}