package com.broandbro.qrapp.partnerfinance.engine;

import com.broandbro.qrapp.partnerfinance.engine.CommissionEngine.*;
import com.broandbro.qrapp.partnerfinance.enums.CommissionBasis;
import com.broandbro.qrapp.partnerfinance.enums.CommissionType;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

class CommissionEngineTest {
    private final CommissionEngine engine = new CommissionEngine();

    private static BigDecimal bd(String v) {
        return new BigDecimal(v);
    }

    private static OrderAmounts order(String gross, String discount, String tax, String grand, String refund, boolean eligible) {
        return new OrderAmounts(bd(gross), bd(discount), bd(tax), bd(grand), bd(refund), eligible);
    }

    private static CommissionRule rule(CommissionBasis basis, String rate) {
        return new CommissionRule(CommissionType.PERCENTAGE, basis, bd(rate));
    }

    @Test
    void grossBasisUsesSubtotalBeforeDiscounts() {
        CommissionResult r = engine.calculate(rule(CommissionBasis.GROSS_SALES, "10"),
                order("500.00", "50.00", "21.43", "450.00", "0", true));
        assertEquals(bd("500.00"), r.basisAmount());
        assertEquals(bd("50.00"), r.commission());
    }

    @Test
    void netBasisIsTaxExclusiveAmountPaid() {
        CommissionResult r = engine.calculate(rule(CommissionBasis.NET_SALES, "10"),
                order("500.00", "50.00", "21.43", "450.00", "0", true));
        assertEquals(bd("428.57"), r.sales().net());
        assertEquals(bd("42.86"), r.commission());
    }

    @Test
    void eligibleBasisIsZeroForIneligibleOrders() {
        CommissionResult ineligible = engine.calculate(rule(CommissionBasis.ELIGIBLE_SALES, "10"),
                order("200.00", "0", "9.52", "200.00", "0", false));
        assertEquals(bd("0.00"), ineligible.basisAmount());
        assertEquals(bd("0.00"), ineligible.commission());

        CommissionResult eligible = engine.calculate(rule(CommissionBasis.ELIGIBLE_SALES, "10"),
                order("200.00", "0", "9.52", "200.00", "0", true));
        assertEquals(bd("190.48"), eligible.basisAmount());
        assertEquals(bd("19.05"), eligible.commission());
    }

    @Test
    void roundsHalfUpAtTheCentBoundary() {
        // 0.05 * 10% = 0.005 -> 0.01 (HALF_UP); 0.04 * 10% = 0.004 -> 0.00
        assertEquals(bd("0.01"), engine.calculate(rule(CommissionBasis.GROSS_SALES, "10"),
                order("0.05", "0", "0", "0.05", "0", true)).commission());
        assertEquals(bd("0.00"), engine.calculate(rule(CommissionBasis.GROSS_SALES, "10"),
                order("0.04", "0", "0", "0.04", "0", true)).commission());
    }

    @Test
    void fractionalRatesKeepPrecisionWithoutFloatingPointDrift() {
        // 0.1 + 0.2 style drift must not appear: 33.33 * 12.3456% = 4.11471... -> 4.11
        CommissionResult r = engine.calculate(rule(CommissionBasis.GROSS_SALES, "12.3456"),
                order("33.33", "0", "0", "33.33", "0", true));
        assertEquals(bd("4.11"), r.commission());
        assertEquals(2, r.commission().scale());
    }

    @Test
    void largeAmountsAreExact() {
        CommissionResult r = engine.calculate(rule(CommissionBasis.GROSS_SALES, "7.5"),
                order("123456789012.34", "0", "0", "123456789012.34", "0", true));
        assertEquals(bd("9259259175.93"), r.commission());
    }

    @Test
    void hundredPercentRateReturnsFullBasis() {
        assertEquals(bd("250.00"), engine.calculate(rule(CommissionBasis.GROSS_SALES, "100"),
                order("250", "0", "0", "250", "0", true)).commission());
    }

    @Test
    void refundReducesNetProportionallyToTaxExclusiveValue() {
        // order 118 incl 18 tax => taxExclusive 100; refund 59 (half) => refundNet 50
        OrderSales s = engine.sales(order("118.00", "0", "18.00", "118.00", "59.00", true));
        assertEquals(bd("50.00"), s.refundNet());
        assertEquals(bd("50.00"), s.net());
        assertEquals(bd("5.00"), engine.calculate(rule(CommissionBasis.NET_SALES, "10"),
                order("118.00", "0", "18.00", "118.00", "59.00", true)).commission());
    }

    @Test
    void fullRefundZeroesNetSales() {
        OrderSales s = engine.sales(order("118.00", "0", "18.00", "118.00", "118.00", true));
        assertEquals(bd("0.00"), s.net());
    }

    @Test
    void refundMoreThanOrderTotalIsRejected() {
        assertThrows(IllegalArgumentException.class, () ->
                engine.sales(order("100.00", "0", "0", "100.00", "100.01", true)));
    }

    @Test
    void missingValuesAreTreatedAsZeroAndGrossFallsBackToTotalPlusDiscount() {
        OrderSales s = engine.sales(new OrderAmounts(null, bd("10.00"), null, bd("90.00"), null, true));
        assertEquals(bd("100.00"), s.gross());
        assertEquals(bd("0.00"), s.tax());
        assertEquals(bd("0.00"), s.refund());
        assertEquals(bd("90.00"), s.net());
    }

    @Test
    void orderWithoutAgreementHasSalesButNoCommission() {
        CommissionResult r = engine.withoutAgreement(order("100.00", "0", "0", "100.00", "0", true));
        assertEquals(bd("100.00"), r.sales().gross());
        assertEquals(bd("0.00"), r.commission());
        assertNull(r.ratePercent());
    }

    @Test
    void invalidRulesAreRejected() {
        assertThrows(IllegalArgumentException.class, () -> rule(CommissionBasis.NET_SALES, "-0.01"));
        assertThrows(IllegalArgumentException.class, () -> rule(CommissionBasis.NET_SALES, "100.0001"));
        assertThrows(IllegalArgumentException.class, () -> new CommissionRule(null, CommissionBasis.NET_SALES, bd("1")));
    }
}