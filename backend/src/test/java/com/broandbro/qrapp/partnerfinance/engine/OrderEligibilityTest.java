package com.broandbro.qrapp.partnerfinance.engine;

import com.broandbro.qrapp.enums.PaymentMethod;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class OrderEligibilityTest {

    @Test
    void paidOrdersAreEligibleForAnyMethod() {
        assertNull(OrderEligibility.exclusionReason(false, "PAID", PaymentMethod.RAZORPAY));
        assertNull(OrderEligibility.exclusionReason(false, "paid", PaymentMethod.PAY_AT_STALL));
    }

    @Test
    void pendingIsEligibleOnlyForPayAtStallAndWallet() {
        assertNull(OrderEligibility.exclusionReason(false, "PENDING", PaymentMethod.PAY_AT_STALL));
        assertNull(OrderEligibility.exclusionReason(false, "PENDING", PaymentMethod.WALLET));
        assertEquals(OrderEligibility.PAYMENT_NOT_SETTLED,
                OrderEligibility.exclusionReason(false, "PENDING", PaymentMethod.RAZORPAY));
    }

    @Test
    void failedMissingAndUnknownPaymentsAreNotEligible() {
        assertEquals(OrderEligibility.PAYMENT_NOT_SETTLED,
                OrderEligibility.exclusionReason(false, "FAILED", PaymentMethod.PAY_AT_STALL));
        assertEquals(OrderEligibility.PAYMENT_NOT_SETTLED,
                OrderEligibility.exclusionReason(false, null, PaymentMethod.WALLET));
        assertEquals(OrderEligibility.PAYMENT_NOT_SETTLED,
                OrderEligibility.exclusionReason(false, "REFUNDED", null));
    }

    @Test
    void preOrdersAreNeverEligible() {
        assertEquals(OrderEligibility.PRE_ORDER, OrderEligibility.exclusionReason(true, "PAID", PaymentMethod.RAZORPAY));
    }
}