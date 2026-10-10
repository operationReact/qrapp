package com.broandbro.qrapp.partnerfinance.service;

import com.broandbro.qrapp.enums.PaymentMethod;
import com.broandbro.qrapp.partnerfinance.engine.CommissionEngine;
import com.broandbro.qrapp.partnerfinance.engine.SettlementPeriod;
import com.broandbro.qrapp.partnerfinance.engine.SettlementRefundSource;
import com.broandbro.qrapp.partnerfinance.engine.UnavailableSettlementRefundSource;
import com.broandbro.qrapp.partnerfinance.entity.PartnerCommissionAgreement;
import com.broandbro.qrapp.partnerfinance.entity.PartnerSettlementLineItem;
import com.broandbro.qrapp.partnerfinance.enums.CommissionBasis;
import com.broandbro.qrapp.partnerfinance.exception.PartnerFinanceException;
import com.broandbro.qrapp.partnerfinance.repository.SettlementOrderRepository;
import com.broandbro.qrapp.partnerfinance.repository.SettlementOrderRepository.OrderRow;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.SliceImpl;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class SettlementCalculatorTest {
    private final SettlementOrderRepository orders = mock(SettlementOrderRepository.class);
    private final CommissionEngine engine = new CommissionEngine();
    private final SettlementPeriod september = SettlementPeriod.parse("2026-09");

    private static BigDecimal bd(String v) {
        return new BigDecimal(v);
    }

    private static PartnerCommissionAgreement agreement(long id, CommissionBasis basis, String rate,
                                                        LocalDate from, LocalDate to) {
        return PartnerCommissionAgreement.builder().id(id).commissionBasis(basis).ratePercent(bd(rate))
                .effectiveFrom(from).effectiveTo(to).build();
    }

    private static OrderRow row(long id, LocalDateTime completedAt, String total, boolean preOrder, String payment) {
        return new OrderRow(id, "ORD-" + id, 7L, "LOC-7", "Main Court", completedAt, bd(total), bd("0"), bd("0"),
                bd(total), preOrder, payment, PaymentMethod.RAZORPAY);
    }

    private SettlementCalculator calculator(SettlementRefundSource refunds, OrderRow... rows) {
        when(orders.findOrderRows(eq(5L), eq(september.startDateTime()), eq(september.endExclusiveDateTime()), any(Pageable.class)))
                .thenReturn(new SliceImpl<>(List.of(rows)));
        return new SettlementCalculator(orders, engine, refunds);
    }

    @Test
    void agreementChangeMidMonthAppliesPerOrderCompletionDate() {
        PartnerCommissionAgreement first = agreement(1, CommissionBasis.GROSS_SALES, "10",
                LocalDate.of(2026, 1, 1), LocalDate.of(2026, 9, 14));
        PartnerCommissionAgreement second = agreement(2, CommissionBasis.GROSS_SALES, "20",
                LocalDate.of(2026, 9, 15), null);
        SettlementCalculator calc = calculator(new UnavailableSettlementRefundSource(),
                row(1, LocalDateTime.of(2026, 9, 14, 23, 59, 59), "100.00", false, "PAID"),
                row(2, LocalDateTime.of(2026, 9, 15, 0, 0, 0), "100.00", false, "PAID"));

        List<PartnerSettlementLineItem> lines = calc.calculate(5L, september, List.of(first, second), 99L);

        assertEquals(1L, lines.get(0).getAgreementId());
        assertEquals(bd("10.00"), lines.get(0).getCommissionAmount());
        assertEquals(2L, lines.get(1).getAgreementId());
        assertEquals(bd("20.00"), lines.get(1).getCommissionAmount());
        assertEquals(99L, lines.get(1).getSettlementId());
    }

    @Test
    void agreementEndDateIsInclusiveAndFutureAgreementsDoNotApply() {
        PartnerCommissionAgreement ended = agreement(1, CommissionBasis.GROSS_SALES, "10",
                LocalDate.of(2026, 9, 1), LocalDate.of(2026, 9, 10));
        PartnerCommissionAgreement future = agreement(2, CommissionBasis.GROSS_SALES, "50",
                LocalDate.of(2026, 10, 1), null);
        SettlementCalculator calc = calculator(new UnavailableSettlementRefundSource(),
                row(1, LocalDateTime.of(2026, 9, 10, 23, 59), "100.00", false, "PAID"),
                row(2, LocalDateTime.of(2026, 9, 11, 0, 0), "100.00", false, "PAID"));

        List<PartnerSettlementLineItem> lines = calc.calculate(5L, september, List.of(ended, future), null);

        assertEquals(bd("10.00"), lines.get(0).getCommissionAmount());
        assertNull(lines.get(1).getAgreementId());
        assertEquals(bd("0.00"), lines.get(1).getCommissionAmount());
        assertEquals(bd("100.00"), lines.get(1).getGrossAmount());
    }

    @Test
    void eligibleBasisOnlyCommissionsEligibleOrders() {
        PartnerCommissionAgreement a = agreement(1, CommissionBasis.ELIGIBLE_SALES, "10",
                LocalDate.of(2026, 1, 1), null);
        SettlementCalculator calc = calculator(new UnavailableSettlementRefundSource(),
                row(1, LocalDateTime.of(2026, 9, 3, 12, 0), "100.00", false, "PAID"),
                row(2, LocalDateTime.of(2026, 9, 3, 13, 0), "100.00", true, "PAID"),
                row(3, LocalDateTime.of(2026, 9, 3, 14, 0), "100.00", false, "PENDING"));

        List<PartnerSettlementLineItem> lines = calc.calculate(5L, september, List.of(a), null);

        assertTrue(lines.get(0).isEligible());
        assertEquals(bd("10.00"), lines.get(0).getCommissionAmount());
        assertFalse(lines.get(1).isEligible());
        assertEquals("PRE_ORDER", lines.get(1).getExclusionReason());
        assertEquals(bd("0.00"), lines.get(1).getCommissionAmount());
        assertEquals("PAYMENT_NOT_SETTLED", lines.get(2).getExclusionReason());

        SettlementTotals totals = SettlementTotals.of(lines);
        assertEquals(3, totals.orderCount());
        assertEquals(1, totals.eligibleOrderCount());
        assertEquals(bd("300.00"), totals.net());
        assertEquals(bd("100.00"), totals.eligibleSales());
        assertEquals(bd("10.00"), totals.commission());
    }

    @Test
    void perOrderRoundingIsSummedExactlyInTotals() {
        PartnerCommissionAgreement a = agreement(1, CommissionBasis.GROSS_SALES, "10",
                LocalDate.of(2026, 1, 1), null);
        SettlementCalculator calc = calculator(new UnavailableSettlementRefundSource(),
                row(1, LocalDateTime.of(2026, 9, 3, 12, 0), "0.05", false, "PAID"),
                row(2, LocalDateTime.of(2026, 9, 3, 12, 1), "0.05", false, "PAID"),
                row(3, LocalDateTime.of(2026, 9, 3, 12, 2), "0.05", false, "PAID"));

        SettlementTotals totals = SettlementTotals.of(calc.calculate(5L, september, List.of(a), null));

        assertEquals(bd("0.03"), totals.commission());
    }

    @Test
    void refundSourceAmountsReduceNetSales() {
        SettlementRefundSource refunds = new SettlementRefundSource() {
            public boolean isAvailable() {
                return true;
            }

            public Map<Long, BigDecimal> refundsByOrderId(java.util.Collection<Long> ids) {
                return Map.of(1L, bd("40.00"));
            }
        };
        PartnerCommissionAgreement a = agreement(1, CommissionBasis.NET_SALES, "10", LocalDate.of(2026, 1, 1), null);
        SettlementCalculator calc = calculator(refunds,
                row(1, LocalDateTime.of(2026, 9, 3, 12, 0), "100.00", false, "PAID"));

        PartnerSettlementLineItem line = calc.calculate(5L, september, List.of(a), null).get(0);

        assertEquals(bd("40.00"), line.getRefundAmount());
        assertEquals(bd("60.00"), line.getNetAmount());
        assertEquals(bd("6.00"), line.getCommissionAmount());
        assertTrue(calc.refundDataAvailable());
    }

    @Test
    void refundDataIsReportedUnavailableAndZeroByDefault() {
        PartnerCommissionAgreement a = agreement(1, CommissionBasis.NET_SALES, "10", LocalDate.of(2026, 1, 1), null);
        SettlementCalculator calc = calculator(new UnavailableSettlementRefundSource(),
                row(1, LocalDateTime.of(2026, 9, 3, 12, 0), "100.00", false, "PAID"));

        PartnerSettlementLineItem line = calc.calculate(5L, september, List.of(a), null).get(0);

        assertFalse(calc.refundDataAvailable());
        assertEquals(bd("0.00"), line.getRefundAmount());
    }

    @Test
    void invalidRefundIsSurfacedAsConflict() {
        SettlementRefundSource refunds = new SettlementRefundSource() {
            public boolean isAvailable() {
                return true;
            }

            public Map<Long, BigDecimal> refundsByOrderId(java.util.Collection<Long> ids) {
                return Map.of(1L, bd("100.01"));
            }
        };
        PartnerCommissionAgreement a = agreement(1, CommissionBasis.NET_SALES, "10", LocalDate.of(2026, 1, 1), null);
        SettlementCalculator calc = calculator(refunds,
                row(1, LocalDateTime.of(2026, 9, 3, 12, 0), "100.00", false, "PAID"));

        assertThrows(PartnerFinanceException.class, () -> calc.calculate(5L, september, List.of(a), null));
    }
}