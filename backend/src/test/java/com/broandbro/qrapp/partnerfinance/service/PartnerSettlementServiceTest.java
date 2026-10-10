package com.broandbro.qrapp.partnerfinance.service;

import com.broandbro.qrapp.entity.*;
import com.broandbro.qrapp.partnerfinance.dto.SettlementDtos.*;
import com.broandbro.qrapp.partnerfinance.engine.FinanceClock;
import com.broandbro.qrapp.partnerfinance.entity.PartnerCommissionAgreement;
import com.broandbro.qrapp.partnerfinance.entity.PartnerSettlement;
import com.broandbro.qrapp.partnerfinance.entity.PartnerSettlementAdjustment;
import com.broandbro.qrapp.partnerfinance.entity.PartnerSettlementLineItem;
import com.broandbro.qrapp.partnerfinance.enums.*;
import com.broandbro.qrapp.partnerfinance.exception.PartnerFinanceException;
import com.broandbro.qrapp.partnerfinance.repository.*;
import com.broandbro.qrapp.service.PartnerAccessService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class PartnerSettlementServiceTest {
    private final PartnerAccessService access = mock(PartnerAccessService.class);
    private final PartnerFinanceLockRepository partners = mock(PartnerFinanceLockRepository.class);
    private final PartnerSettlementRepository settlements = mock(PartnerSettlementRepository.class);
    private final PartnerSettlementLineItemRepository lineItems = mock(PartnerSettlementLineItemRepository.class);
    private final PartnerSettlementAdjustmentRepository adjustments = mock(PartnerSettlementAdjustmentRepository.class);
    private final PartnerFinanceAuditRepository auditRepository = mock(PartnerFinanceAuditRepository.class);
    private final SettlementOrderRepository orders = mock(SettlementOrderRepository.class);
    private final PartnerAgreementService agreementService = mock(PartnerAgreementService.class);
    private final SettlementCalculator calculator = mock(SettlementCalculator.class);
    private final FinanceAuditService audit = mock(FinanceAuditService.class);
    private final SettlementStatementPdfService pdf = mock(SettlementStatementPdfService.class);
    private final Authentication auth = mock(Authentication.class);

    // 2026-10-09 04:00 Asia/Kolkata
    private final FinanceClock clock = new FinanceClock(
            Clock.fixed(Instant.parse("2026-10-08T22:30:00Z"), ZoneId.of("UTC")));

    private final Partner partner = Partner.builder().id(5L).legalName("Urban Work LLP").build();
    private PartnerSettlementService service;

    @BeforeEach
    void setUp() {
        service = new PartnerSettlementService(access, partners, settlements, lineItems, adjustments,
                auditRepository, orders, agreementService, calculator, audit, clock, pdf);
        when(access.getCurrentPartner(auth)).thenReturn(partner);
        when(adjustments.findBySettlementIdOrderByCreatedAtAscIdAsc(any())).thenReturn(List.of());
        when(adjustments.sumBySettlementId(any())).thenReturn(BigDecimal.ZERO);
        when(settlements.saveAndFlush(any())).thenAnswer(i -> i.getArgument(0));
        when(settlements.save(any())).thenAnswer(i -> i.getArgument(0));
    }

    private void actingAs(UserRole role) {
        User user = User.builder().id(10L).name("Asha").phone("9000000000").role(role).build();
        PartnerUser association = PartnerUser.builder().partner(partner).user(user).active(true).build();
        when(access.currentAssociation(auth)).thenReturn(association);
    }

    private static BigDecimal bd(String v) {
        return new BigDecimal(v);
    }

    private PartnerSettlement settlement(SettlementStatus status, String period) {
        LocalDate start = LocalDate.parse(period + "-01");
        PartnerSettlement s = PartnerSettlement.builder().id(77L).partner(partner).periodStart(start)
                .periodEnd(start.withDayOfMonth(start.lengthOfMonth())).status(status)
                .partnerNameSnapshot("Urban Work LLP").orderCount(1).grossSales(bd("100.00"))
                .orderGrandTotal(bd("100.00")).netSales(bd("100.00")).commissionAmount(bd("10.00"))
                .netPayable(bd("10.00")).build();
        when(settlements.findForUpdate(77L, 5L)).thenReturn(Optional.of(s));
        when(settlements.findByIdAndPartnerId(77L, 5L)).thenReturn(Optional.of(s));
        return s;
    }

    private PartnerSettlementLineItem line(String gross, String commission) {
        return PartnerSettlementLineItem.builder().grossAmount(bd(gross)).discountAmount(bd("0.00"))
                .taxAmount(bd("0.00")).refundAmount(bd("0.00")).grandTotal(bd(gross)).netAmount(bd(gross))
                .basisAmount(bd(gross)).commissionAmount(bd(commission)).eligible(true).build();
    }

    private void agreementCovers(String from) {
        when(agreementService.activeAgreements(5L)).thenReturn(List.of(PartnerCommissionAgreement.builder()
                .id(1L).commissionBasis(CommissionBasis.GROSS_SALES).ratePercent(bd("10"))
                .effectiveFrom(LocalDate.parse(from)).taxTreatment(TaxTreatment.DEFERRED).build()));
    }

    // ---------------------------------------------------------- security

    @Test
    void partnerUserIsReadOnlyForEveryFinancialMutation() {
        actingAs(UserRole.PARTNER_USER);
        assertThrows(AccessDeniedException.class, () -> service.generate(auth, new GenerateSettlementRequest("2026-09", true)));
        assertThrows(AccessDeniedException.class, () -> service.recalculate(auth, 77L));
        assertThrows(AccessDeniedException.class, () -> service.addAdjustment(auth, 77L,
                new AdjustmentRequest(AdjustmentType.MANUAL_CREDIT, bd("1.00"), "because")));
        assertThrows(AccessDeniedException.class, () -> service.approve(auth, 77L));
        assertThrows(AccessDeniedException.class, () -> service.markPaid(auth, 77L, new MarkPaidRequest("REF", null, null)));
        assertThrows(AccessDeniedException.class, () -> service.voidSettlement(auth, 77L, new ReasonRequest("because")));
        verify(settlements, never()).save(any());
        verify(settlements, never()).saveAndFlush(any());
        verify(settlements, never()).findForUpdate(any(), any());
        verifyNoInteractions(audit);
    }

    @Test
    void partnerUserCanReadSettlements() {
        PartnerSettlement s = settlement(SettlementStatus.CALCULATED, "2026-09");
        SettlementDetailResponse detail = service.detail(auth, 77L);
        assertEquals(s.getId(), detail.settlement().id());
        assertEquals("2026-09", detail.settlement().period());
        assertEquals("SOURCE_UNAVAILABLE_ZERO", detail.settlement().refundSemantics());
    }

    @Test
    void anotherPartnersSettlementIsNotFoundAndLookupIsAlwaysScopedToCurrentPartner() {
        when(settlements.findByIdAndPartnerId(99L, 5L)).thenReturn(Optional.empty());
        PartnerFinanceException e = assertThrows(PartnerFinanceException.class, () -> service.detail(auth, 99L));
        assertEquals("settlement_not_found", e.getCode());
        assertThrows(PartnerFinanceException.class, () -> service.auditTrail(auth, 99L));
        assertThrows(PartnerFinanceException.class, () -> service.lineItems(auth, 99L, null, 0, 10));
        assertThrows(PartnerFinanceException.class, () -> service.statement(auth, 99L));
        verify(settlements, never()).findById(any());
        verifyNoInteractions(pdf);
    }

    @Test
    void lineItemLocationFilterRequiresAccessToThatLocation() {
        settlement(SettlementStatus.CALCULATED, "2026-09");
        when(access.accessibleLocation(eq(999L), eq(auth))).thenThrow(new AccessDeniedException("partner_location_access_denied"));
        assertThrows(AccessDeniedException.class, () -> service.lineItems(auth, 77L, 999L, 0, 10));
        verifyNoInteractions(lineItems);
    }

    @Test
    void mutationsOnAnotherPartnersSettlementAreNotFound() {
        actingAs(UserRole.PARTNER_ADMIN);
        when(settlements.findForUpdate(99L, 5L)).thenReturn(Optional.empty());
        assertThrows(PartnerFinanceException.class, () -> service.approve(auth, 99L));
        assertThrows(PartnerFinanceException.class, () -> service.markPaid(auth, 99L, new MarkPaidRequest("REF", null, null)));
        assertThrows(PartnerFinanceException.class, () -> service.voidSettlement(auth, 99L, new ReasonRequest("because")));
    }

    // -------------------------------------------------------- generation

    @Test
    void duplicatePartnerPeriodIsRejected() {
        actingAs(UserRole.PARTNER_ADMIN);
        when(settlements.existsByPartnerIdAndPeriodStartAndStatusNot(5L, LocalDate.of(2026, 9, 1), SettlementStatus.VOID))
                .thenReturn(true);
        PartnerFinanceException e = assertThrows(PartnerFinanceException.class,
                () -> service.generate(auth, new GenerateSettlementRequest("2026-09", true)));
        assertEquals("settlement_already_exists_for_period", e.getCode());
        verify(settlements, never()).saveAndFlush(any());
    }

    @Test
    void futurePeriodIsRejected() {
        actingAs(UserRole.PARTNER_ADMIN);
        PartnerFinanceException e = assertThrows(PartnerFinanceException.class,
                () -> service.generate(auth, new GenerateSettlementRequest("2026-11", true)));
        assertEquals("settlement_period_in_future", e.getCode());
    }

    @Test
    void generationWithoutAnyAgreementFails() {
        actingAs(UserRole.PARTNER_ADMIN);
        when(agreementService.activeAgreements(5L)).thenReturn(List.of());
        PartnerFinanceException e = assertThrows(PartnerFinanceException.class,
                () -> service.generate(auth, new GenerateSettlementRequest("2026-09", true)));
        assertEquals("no_commission_agreement_for_period", e.getCode());
    }

    @Test
    void generateCalculatesFromDatabaseTotalsAndAudits() {
        actingAs(UserRole.PARTNER_ADMIN);
        agreementCovers("2026-01-01");
        when(settlements.saveAndFlush(any())).thenAnswer(i -> {
            PartnerSettlement s = i.getArgument(0);
            if (s.getId() == null) s.setId(77L);
            return s;
        });
        when(calculator.calculate(eq(5L), any(), any(), eq(77L))).thenReturn(List.of(line("100.00", "10.00")));
        when(calculator.refundDataAvailable()).thenReturn(false);
        when(lineItems.totals(77L)).thenReturn(new PartnerSettlementLineItemRepository.LineTotals(
                1L, 1L, bd("100.00"), bd("0"), bd("0"), bd("0"), bd("100.00"), bd("100.00"), bd("100.00"), bd("10.00")));
        when(lineItems.eligibleNetSales(77L)).thenReturn(bd("100.00"));
        when(orders.totals(eq(5L), any(), any())).thenReturn(
                new SettlementOrderRepository.OrderTotals(1L, bd("100.00"), bd("0.00")));
        when(adjustments.sumBySettlementId(77L)).thenReturn(bd("2.50"));

        SettlementDetailResponse response = service.generate(auth, new GenerateSettlementRequest("2026-09", null));

        assertEquals(SettlementStatus.CALCULATED, response.settlement().status());
        assertEquals(bd("10.00"), response.settlement().commissionAmount());
        assertEquals(bd("12.50"), response.settlement().netPayable());
        assertEquals("Urban Work LLP", response.settlement().partnerName());
        assertFalse(response.settlement().refundDataAvailable());
        ArgumentCaptor<String> actions = ArgumentCaptor.forClass(String.class);
        verify(audit, times(2)).record(eq(5L), eq(FinanceEntityType.SETTLEMENT), eq(77L), actions.capture(),
                any(), any(), any(), any());
        assertEquals(List.of("CREATED", "CALCULATED"), actions.getAllValues());
    }

    @Test
    void generationFailsWhenOrdersChangeDuringCalculation() {
        actingAs(UserRole.PARTNER_ADMIN);
        agreementCovers("2026-01-01");
        when(settlements.saveAndFlush(any())).thenAnswer(i -> {
            PartnerSettlement s = i.getArgument(0);
            s.setId(77L);
            return s;
        });
        when(calculator.calculate(eq(5L), any(), any(), eq(77L))).thenReturn(List.of(line("100.00", "10.00")));
        when(lineItems.totals(77L)).thenReturn(new PartnerSettlementLineItemRepository.LineTotals(
                1L, 1L, bd("100.00"), bd("0"), bd("0"), bd("0"), bd("100.00"), bd("100.00"), bd("100.00"), bd("10.00")));
        when(orders.totals(eq(5L), any(), any())).thenReturn(
                new SettlementOrderRepository.OrderTotals(2L, bd("250.00"), bd("0.00")));

        PartnerFinanceException e = assertThrows(PartnerFinanceException.class,
                () -> service.generate(auth, new GenerateSettlementRequest("2026-09", true)));
        assertEquals("settlement_source_changed_retry", e.getCode());
    }

    // ------------------------------------------------------- adjustments

    @Test
    void debitAdjustmentIsStoredNegativeAndReducesNetPayable() {
        actingAs(UserRole.PARTNER_ADMIN);
        PartnerSettlement s = settlement(SettlementStatus.CALCULATED, "2026-09");
        when(adjustments.sumBySettlementId(77L)).thenReturn(bd("-4.00"));

        SettlementDetailResponse r = service.addAdjustment(auth, 77L,
                new AdjustmentRequest(AdjustmentType.MANUAL_DEBIT, bd("4.00"), "Duplicate charge"));

        ArgumentCaptor<PartnerSettlementAdjustment> captor = ArgumentCaptor.forClass(PartnerSettlementAdjustment.class);
        verify(adjustments).saveAndFlush(captor.capture());
        assertEquals(bd("-4.00"), captor.getValue().getAmount());
        assertEquals("Asha", captor.getValue().getCreatedBy());
        assertEquals(bd("6.00"), s.getNetPayable());
        assertEquals(bd("6.00"), r.settlement().netPayable());
        verify(audit).record(eq(5L), eq(FinanceEntityType.SETTLEMENT), eq(77L), eq("ADJUSTMENT_ADDED"), any(),
                contains("netPayable=10.00"), contains("netPayable=6.00"), contains("Duplicate charge"));
    }

    @Test
    void adjustmentCannotMakeNetPayableNegative() {
        actingAs(UserRole.PARTNER_ADMIN);
        settlement(SettlementStatus.CALCULATED, "2026-09");
        PartnerFinanceException e = assertThrows(PartnerFinanceException.class, () -> service.addAdjustment(auth, 77L,
                new AdjustmentRequest(AdjustmentType.REFUND_ADJUSTMENT, bd("10.01"), "Too much")));
        assertEquals("adjustment_makes_net_payable_negative", e.getCode());
        verify(adjustments, never()).saveAndFlush(any());
    }

    @Test
    void adjustmentWithMoreThanTwoDecimalsIsRejected() {
        actingAs(UserRole.PARTNER_ADMIN);
        settlement(SettlementStatus.CALCULATED, "2026-09");
        assertThrows(PartnerFinanceException.class, () -> service.addAdjustment(auth, 77L,
                new AdjustmentRequest(AdjustmentType.MANUAL_CREDIT, bd("1.005"), "Odd")));
    }

    @Test
    void approvedSettlementRejectsAdjustmentsAndRecalculation() {
        actingAs(UserRole.PARTNER_ADMIN);
        settlement(SettlementStatus.APPROVED, "2026-09");
        assertEquals("settlement_not_open_for_adjustments", assertThrows(PartnerFinanceException.class,
                () -> service.addAdjustment(auth, 77L,
                        new AdjustmentRequest(AdjustmentType.MANUAL_CREDIT, bd("1.00"), "late"))).getCode());
        assertEquals("settlement_not_recalculable", assertThrows(PartnerFinanceException.class,
                () -> service.recalculate(auth, 77L)).getCode());
    }

    // ---------------------------------------------------------- approval

    @Test
    void approveRequiresCalculatedStatus() {
        actingAs(UserRole.PARTNER_ADMIN);
        settlement(SettlementStatus.DRAFT, "2026-09");
        assertEquals("settlement_not_calculated",
                assertThrows(PartnerFinanceException.class, () -> service.approve(auth, 77L)).getCode());
    }

    @Test
    void approveRequiresClosedPeriod() {
        actingAs(UserRole.PARTNER_ADMIN);
        settlement(SettlementStatus.CALCULATED, "2026-10");
        assertEquals("settlement_period_not_closed",
                assertThrows(PartnerFinanceException.class, () -> service.approve(auth, 77L)).getCode());
    }

    @Test
    void approveFailsWhenSourceOrdersChangedSinceCalculation() {
        actingAs(UserRole.PARTNER_ADMIN);
        PartnerSettlement s = settlement(SettlementStatus.CALCULATED, "2026-09");
        agreementCovers("2026-01-01");
        when(calculator.calculate(eq(5L), any(), any(), isNull()))
                .thenReturn(List.of(line("100.00", "10.00"), line("50.00", "5.00")));
        assertEquals("settlement_stale_recalculate_required",
                assertThrows(PartnerFinanceException.class, () -> service.approve(auth, 77L)).getCode());
        assertEquals(SettlementStatus.CALCULATED, s.getStatus());
    }

    @Test
    void approveFailsWhenAgreementChangedSinceCalculation() {
        actingAs(UserRole.PARTNER_ADMIN);
        settlement(SettlementStatus.CALCULATED, "2026-09");
        agreementCovers("2026-01-01");
        when(calculator.calculate(eq(5L), any(), any(), isNull())).thenReturn(List.of(line("100.00", "12.00")));
        assertEquals("settlement_stale_recalculate_required",
                assertThrows(PartnerFinanceException.class, () -> service.approve(auth, 77L)).getCode());
    }

    @Test
    void approveFailsForNegativeNetPayable() {
        actingAs(UserRole.PARTNER_ADMIN);
        PartnerSettlement s = settlement(SettlementStatus.CALCULATED, "2026-09");
        s.setNetPayable(bd("-1.00"));
        assertEquals("settlement_net_payable_negative",
                assertThrows(PartnerFinanceException.class, () -> service.approve(auth, 77L)).getCode());
    }

    @Test
    void approveSucceedsWhenFreshCalculationMatchesAndIsAudited() {
        actingAs(UserRole.PARTNER_ADMIN);
        PartnerSettlement s = settlement(SettlementStatus.CALCULATED, "2026-09");
        agreementCovers("2026-01-01");
        when(calculator.calculate(eq(5L), any(), any(), isNull())).thenReturn(List.of(line("100.00", "10.00")));

        SettlementDetailResponse r = service.approve(auth, 77L);

        assertEquals(SettlementStatus.APPROVED, r.settlement().status());
        assertEquals("Asha", s.getApprovedBy());
        assertNotNull(s.getApprovedAt());
        verify(audit).record(eq(5L), eq(FinanceEntityType.SETTLEMENT), eq(77L), eq("APPROVED"), any(),
                contains("status=CALCULATED"), contains("status=APPROVED"), isNull());
    }

    // ----------------------------------------------------- paid and void

    @Test
    void markPaidRequiresApprovedStatus() {
        actingAs(UserRole.PARTNER_ADMIN);
        settlement(SettlementStatus.CALCULATED, "2026-09");
        assertEquals("settlement_not_approved", assertThrows(PartnerFinanceException.class,
                () -> service.markPaid(auth, 77L, new MarkPaidRequest("UTR1", null, null))).getCode());
    }

    @Test
    void markPaidValidatesPaymentDate() {
        actingAs(UserRole.PARTNER_ADMIN);
        settlement(SettlementStatus.APPROVED, "2026-09");
        assertEquals("paid_on_in_future", assertThrows(PartnerFinanceException.class, () -> service.markPaid(auth, 77L,
                new MarkPaidRequest("UTR1", LocalDate.of(2026, 10, 10), null))).getCode());
        assertEquals("paid_on_before_period_end", assertThrows(PartnerFinanceException.class, () -> service.markPaid(auth, 77L,
                new MarkPaidRequest("UTR1", LocalDate.of(2026, 9, 29), null))).getCode());
    }

    @Test
    void markPaidRecordsReferenceAndBecomesTerminal() {
        actingAs(UserRole.PARTNER_ADMIN);
        PartnerSettlement s = settlement(SettlementStatus.APPROVED, "2026-09");

        service.markPaid(auth, 77L, new MarkPaidRequest(" UTR123 ", null, " bank transfer "));

        assertEquals(SettlementStatus.PAID, s.getStatus());
        assertEquals("UTR123", s.getPaymentReference());
        assertEquals(LocalDate.of(2026, 10, 9), s.getPaidOn());
        assertEquals("bank transfer", s.getPaymentNote());
        assertThrows(PartnerFinanceException.class, () -> service.voidSettlement(auth, 77L, new ReasonRequest("oops")));
        assertThrows(PartnerFinanceException.class, () -> service.approve(auth, 77L));
    }

    @Test
    void voidIsAllowedUntilPaidAndRequiresReasonAudit() {
        actingAs(UserRole.PARTNER_ADMIN);
        PartnerSettlement s = settlement(SettlementStatus.APPROVED, "2026-09");

        service.voidSettlement(auth, 77L, new ReasonRequest("Wrong period"));

        assertEquals(SettlementStatus.VOID, s.getStatus());
        assertEquals("Wrong period", s.getVoidReason());
        verify(audit).record(eq(5L), eq(FinanceEntityType.SETTLEMENT), eq(77L), eq("VOIDED"), any(),
                contains("status=APPROVED"), contains("status=VOID"), eq("Wrong period"));
        assertThrows(PartnerFinanceException.class, () -> service.markPaid(auth, 77L, new MarkPaidRequest("X", null, null)));
    }

    // -------------------------------------------------------- transitions

    @Test
    void lifecycleTransitionMatrix() {
        assertTrue(SettlementStatus.DRAFT.canTransitionTo(SettlementStatus.CALCULATED));
        assertTrue(SettlementStatus.CALCULATED.canTransitionTo(SettlementStatus.APPROVED));
        assertTrue(SettlementStatus.APPROVED.canTransitionTo(SettlementStatus.PAID));
        for (SettlementStatus s : List.of(SettlementStatus.DRAFT, SettlementStatus.CALCULATED, SettlementStatus.APPROVED)) {
            assertTrue(s.canTransitionTo(SettlementStatus.VOID), s + " -> VOID");
        }
        assertFalse(SettlementStatus.DRAFT.canTransitionTo(SettlementStatus.APPROVED));
        assertFalse(SettlementStatus.DRAFT.canTransitionTo(SettlementStatus.PAID));
        assertFalse(SettlementStatus.CALCULATED.canTransitionTo(SettlementStatus.PAID));
        assertFalse(SettlementStatus.APPROVED.canTransitionTo(SettlementStatus.CALCULATED));
        for (SettlementStatus next : SettlementStatus.values()) {
            assertFalse(SettlementStatus.PAID.canTransitionTo(next), "PAID -> " + next);
            assertFalse(SettlementStatus.VOID.canTransitionTo(next), "VOID -> " + next);
        }
        assertTrue(SettlementStatus.DRAFT.isOpen() && SettlementStatus.CALCULATED.isOpen());
        assertFalse(SettlementStatus.APPROVED.isOpen());
    }

    // ------------------------------------------------------------ preview

    @Test
    void previewDoesNotPersistAnything() {
        agreementCovers("2026-01-01");
        when(calculator.calculate(eq(5L), any(), any(), isNull())).thenReturn(List.of(line("100.00", "10.00")));
        PreviewResponse p = service.preview(auth, "2026-09");
        assertEquals(bd("10.00"), p.commissionAmount());
        assertTrue(p.periodClosed());
        assertTrue(p.agreementCoverage());
        verify(settlements, never()).save(any());
        verify(settlements, never()).saveAndFlush(any());
        verifyNoInteractions(audit);
    }
}