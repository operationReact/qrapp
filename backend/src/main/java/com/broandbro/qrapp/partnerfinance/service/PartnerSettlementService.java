package com.broandbro.qrapp.partnerfinance.service;

import com.broandbro.qrapp.entity.Partner;
import com.broandbro.qrapp.entity.PartnerUser;
import com.broandbro.qrapp.entity.UserRole;
import com.broandbro.qrapp.partnerfinance.dto.SettlementDtos.*;
import com.broandbro.qrapp.partnerfinance.engine.FinanceClock;
import com.broandbro.qrapp.partnerfinance.engine.SettlementPeriod;
import com.broandbro.qrapp.partnerfinance.entity.*;
import com.broandbro.qrapp.partnerfinance.enums.*;
import com.broandbro.qrapp.partnerfinance.exception.PartnerFinanceException;
import com.broandbro.qrapp.partnerfinance.repository.*;
import com.broandbro.qrapp.partnerfinance.repository.PartnerSettlementLineItemRepository.LineTotals;
import com.broandbro.qrapp.partnerfinance.repository.SettlementOrderRepository.OrderTotals;
import com.broandbro.qrapp.service.MoneyService;
import com.broandbro.qrapp.service.PartnerAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;

import static com.broandbro.qrapp.partnerfinance.dto.SettlementDtos.REFUND_APPLIED;
import static com.broandbro.qrapp.partnerfinance.dto.SettlementDtos.REFUND_UNAVAILABLE;
import static com.broandbro.qrapp.partnerfinance.dto.SettlementDtos.TAX_NOTE;

/**
 * Monthly partner settlement lifecycle: DRAFT -> CALCULATED -> APPROVED -> PAID, with VOID from any
 * non-terminal state. Every read is scoped to the caller's own partner through {@link PartnerAccessService};
 * every mutation requires PARTNER_ADMIN and is audited in the same transaction.
 */
@Service
@RequiredArgsConstructor
public class PartnerSettlementService {
    private final PartnerAccessService access;
    private final PartnerFinanceLockRepository partners;
    private final PartnerSettlementRepository settlements;
    private final PartnerSettlementLineItemRepository lineItems;
    private final PartnerSettlementAdjustmentRepository adjustments;
    private final PartnerFinanceAuditRepository auditRepository;
    private final SettlementOrderRepository orders;
    private final PartnerAgreementService agreementService;
    private final SettlementCalculator calculator;
    private final FinanceAuditService audit;
    private final FinanceClock clock;
    private final SettlementStatementPdfService statementPdf;

    // ---------------------------------------------------------------- reads

    @Transactional(readOnly = true)
    public Page<SettlementResponse> list(Authentication authentication, SettlementStatus status, int page, int size) {
        Partner partner = access.getCurrentPartner(authentication);
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.min(Math.max(1, size), 100));
        Page<PartnerSettlement> result = status == null
                ? settlements.findByPartnerIdOrderByPeriodStartDescIdDesc(partner.getId(), pageable)
                : settlements.findByPartnerIdAndStatusOrderByPeriodStartDescIdDesc(partner.getId(), status, pageable);
        return result.map(SettlementResponse::from);
    }

    @Transactional(readOnly = true)
    public SettlementDetailResponse detail(Authentication authentication, Long id) {
        return detailOf(requireOwned(authentication, id));
    }

    @Transactional(readOnly = true)
    public Page<LineItemResponse> lineItems(Authentication authentication, Long id, Long locationId,
                                            int page, int size) {
        PartnerSettlement settlement = requireOwned(authentication, id);
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.min(Math.max(1, size), 200));
        if (locationId != null) {
            access.accessibleLocation(locationId, authentication);
            return lineItems.findBySettlementIdAndLocationIdOrderByCompletedAtAscIdAsc(
                    settlement.getId(), locationId, pageable).map(LineItemResponse::from);
        }
        return lineItems.findBySettlementIdOrderByCompletedAtAscIdAsc(settlement.getId(), pageable)
                .map(LineItemResponse::from);
    }

    @Transactional(readOnly = true)
    public List<AuditResponse> auditTrail(Authentication authentication, Long id) {
        PartnerSettlement settlement = requireOwned(authentication, id);
        return auditRepository.findByPartnerIdAndEntityTypeAndEntityIdOrderByCreatedAtAscIdAsc(
                settlement.getPartner().getId(), FinanceEntityType.SETTLEMENT, settlement.getId())
                .stream().map(AuditResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public FinanceSummaryResponse summary(Authentication authentication) {
        Partner partner = access.getCurrentPartner(authentication);
        List<StatusSummary> byStatus = settlements.totalsByStatus(partner.getId()).stream()
                .map(row -> new StatusSummary(row.getStatus(), row.getCount(), MoneyService.amount(row.getNetPayable())))
                .sorted(Comparator.comparing(StatusSummary::status)).toList();
        return new FinanceSummaryResponse(byStatus, totalFor(byStatus, SettlementStatus.APPROVED),
                totalFor(byStatus, SettlementStatus.PAID), TAX_NOTE);
    }

    public record StatementFile(String filename, byte[] content) {
    }

    @Transactional(readOnly = true)
    public StatementFile statement(Authentication authentication, Long id) {
        PartnerSettlement settlement = requireOwned(authentication, id);
        byte[] pdf = statementPdf.render(settlement,
                adjustments.findBySettlementIdOrderByCreatedAtAscIdAsc(settlement.getId()));
        String period = settlement.getPeriodStart().toString().substring(0, 7);
        return new StatementFile("settlement-" + period + "-" + settlement.getId() + ".pdf", pdf);
    }

    /** Read-only projection of a month using the same engine as generation; nothing is persisted. */
    @Transactional(readOnly = true)
    public PreviewResponse preview(Authentication authentication, String periodValue) {
        Partner partner = access.getCurrentPartner(authentication);
        SettlementPeriod period = SettlementPeriod.parse(periodValue);
        if (!period.hasStarted(clock.today())) {
            throw PartnerFinanceException.validation("settlement_period_in_future");
        }
        List<PartnerCommissionAgreement> overlapping = overlappingAgreements(partner.getId(), period);
        SettlementTotals totals = SettlementTotals.of(
                calculator.calculate(partner.getId(), period, overlapping, null));
        boolean refunds = calculator.refundDataAvailable();
        return new PreviewResponse(period.toString(), period.start(), period.end(), period.isClosed(clock.today()),
                totals.orderCount(), totals.eligibleOrderCount(), totals.gross(), totals.discount(), totals.tax(),
                totals.refund(), totals.net(), totals.eligibleSales(), totals.basis(), totals.commission(),
                refunds, refunds ? REFUND_APPLIED : REFUND_UNAVAILABLE, !overlapping.isEmpty(), TAX_NOTE);
    }

    // ------------------------------------------------------------ mutations

    @Transactional
    public SettlementDetailResponse generate(Authentication authentication, GenerateSettlementRequest request) {
        FinanceActor actor = requireAdmin(authentication);
        Partner partner = access.getCurrentPartner(authentication);
        partners.lockPartner(partner.getId());
        SettlementPeriod period = SettlementPeriod.parse(request.period());
        if (!period.hasStarted(clock.today())) {
            throw PartnerFinanceException.validation("settlement_period_in_future");
        }
        if (settlements.existsByPartnerIdAndPeriodStartAndStatusNot(
                partner.getId(), period.start(), SettlementStatus.VOID)) {
            throw PartnerFinanceException.conflict("settlement_already_exists_for_period");
        }
        PartnerSettlement settlement;
        try {
            settlement = settlements.saveAndFlush(PartnerSettlement.builder()
                    .partner(partner)
                    .periodStart(period.start())
                    .periodEnd(period.end())
                    .partnerNameSnapshot(partner.getLegalName())
                    .createdBy(actor.name())
                    .build());
        } catch (DataIntegrityViolationException e) {
            throw PartnerFinanceException.conflict("settlement_already_exists_for_period");
        }
        audit.record(partner.getId(), FinanceEntityType.SETTLEMENT, settlement.getId(), "CREATED", actor,
                null, describe(settlement), null);
        if (request.calculate() == null || request.calculate()) {
            calculateInto(settlement, period, actor);
        }
        return detailOf(settlement);
    }

    @Transactional
    public SettlementDetailResponse recalculate(Authentication authentication, Long id) {
        FinanceActor actor = requireAdmin(authentication);
        PartnerSettlement settlement = lockOwned(authentication, id);
        if (!settlement.getStatus().isOpen()) {
            throw PartnerFinanceException.conflict("settlement_not_recalculable");
        }
        calculateInto(settlement, SettlementPeriod.of(settlement.getPeriodStart()), actor);
        return detailOf(settlement);
    }

    @Transactional
    public SettlementDetailResponse addAdjustment(Authentication authentication, Long id, AdjustmentRequest request) {
        FinanceActor actor = requireAdmin(authentication);
        PartnerSettlement settlement = lockOwned(authentication, id);
        if (!settlement.getStatus().isOpen()) {
            throw PartnerFinanceException.conflict("settlement_not_open_for_adjustments");
        }
        BigDecimal magnitude = MoneyService.amount(request.amount());
        if (magnitude.signum() <= 0 || request.amount().compareTo(magnitude) != 0) {
            throw PartnerFinanceException.validation("adjustment_amount_invalid");
        }
        BigDecimal signed = request.type().sign() < 0 ? magnitude.negate() : magnitude;
        BigDecimal newNetPayable = settlement.getCommissionAmount()
                .add(settlement.getAdjustmentTotal()).add(signed);
        if (newNetPayable.signum() < 0) {
            throw PartnerFinanceException.conflict("adjustment_makes_net_payable_negative");
        }
        String previous = describe(settlement);
        adjustments.saveAndFlush(PartnerSettlementAdjustment.builder()
                .settlementId(settlement.getId())
                .partnerId(settlement.getPartner().getId())
                .adjustmentType(request.type())
                .amount(signed)
                .reason(request.reason().trim())
                .createdBy(actor.name())
                .build());
        refreshAdjustments(settlement);
        settlements.save(settlement);
        audit.record(settlement.getPartner().getId(), FinanceEntityType.SETTLEMENT, settlement.getId(),
                "ADJUSTMENT_ADDED", actor, previous, describe(settlement),
                request.type() + " " + signed.toPlainString() + ": " + request.reason().trim());
        return detailOf(settlement);
    }

    @Transactional
    public SettlementDetailResponse approve(Authentication authentication, Long id) {
        FinanceActor actor = requireAdmin(authentication);
        PartnerSettlement settlement = lockOwned(authentication, id);
        if (settlement.getStatus() != SettlementStatus.CALCULATED) {
            throw PartnerFinanceException.conflict("settlement_not_calculated");
        }
        SettlementPeriod period = SettlementPeriod.of(settlement.getPeriodStart());
        if (!period.isClosed(clock.today())) {
            throw PartnerFinanceException.conflict("settlement_period_not_closed");
        }
        if (settlement.getNetPayable().signum() < 0) {
            throw PartnerFinanceException.conflict("settlement_net_payable_negative");
        }
        requireNotStale(settlement, period);
        String previous = describe(settlement);
        settlement.transitionTo(SettlementStatus.APPROVED);
        settlement.setApprovedAt(clock.now());
        settlement.setApprovedBy(actor.name());
        settlements.saveAndFlush(settlement);
        audit.record(settlement.getPartner().getId(), FinanceEntityType.SETTLEMENT, settlement.getId(),
                "APPROVED", actor, previous, describe(settlement), null);
        return detailOf(settlement);
    }

    @Transactional
    public SettlementDetailResponse markPaid(Authentication authentication, Long id, MarkPaidRequest request) {
        FinanceActor actor = requireAdmin(authentication);
        PartnerSettlement settlement = lockOwned(authentication, id);
        if (settlement.getStatus() != SettlementStatus.APPROVED) {
            throw PartnerFinanceException.conflict("settlement_not_approved");
        }
        LocalDate today = clock.today();
        LocalDate paidOn = request.paidOn() == null ? today : request.paidOn();
        if (paidOn.isAfter(today)) {
            throw PartnerFinanceException.validation("paid_on_in_future");
        }
        if (paidOn.isBefore(settlement.getPeriodEnd())) {
            throw PartnerFinanceException.validation("paid_on_before_period_end");
        }
        String previous = describe(settlement);
        settlement.transitionTo(SettlementStatus.PAID);
        settlement.setPaidAt(clock.now());
        settlement.setPaidBy(actor.name());
        settlement.setPaidOn(paidOn);
        settlement.setPaymentReference(request.paymentReference().trim());
        settlement.setPaymentNote(request.note() == null || request.note().isBlank() ? null : request.note().trim());
        settlements.saveAndFlush(settlement);
        audit.record(settlement.getPartner().getId(), FinanceEntityType.SETTLEMENT, settlement.getId(),
                "PAID", actor, previous, describe(settlement) + ";reference=" + settlement.getPaymentReference(),
                settlement.getPaymentNote());
        return detailOf(settlement);
    }

    @Transactional
    public SettlementDetailResponse voidSettlement(Authentication authentication, Long id, ReasonRequest request) {
        FinanceActor actor = requireAdmin(authentication);
        PartnerSettlement settlement = lockOwned(authentication, id);
        String previous = describe(settlement);
        settlement.transitionTo(SettlementStatus.VOID);
        settlement.setVoidedAt(clock.now());
        settlement.setVoidedBy(actor.name());
        settlement.setVoidReason(request.reason().trim());
        settlements.saveAndFlush(settlement);
        audit.record(settlement.getPartner().getId(), FinanceEntityType.SETTLEMENT, settlement.getId(),
                "VOIDED", actor, previous, describe(settlement), request.reason().trim());
        return detailOf(settlement);
    }

    // -------------------------------------------------------------- helpers

    private void calculateInto(PartnerSettlement settlement, SettlementPeriod period, FinanceActor actor) {
        Long partnerId = settlement.getPartner().getId();
        List<PartnerCommissionAgreement> overlapping = overlappingAgreements(partnerId, period);
        if (overlapping.isEmpty()) {
            throw PartnerFinanceException.conflict("no_commission_agreement_for_period");
        }
        String previous = describe(settlement);
        boolean first = settlement.getStatus() == SettlementStatus.DRAFT;
        lineItems.deleteBySettlementId(settlement.getId());
        List<PartnerSettlementLineItem> built = calculator.calculate(partnerId, period, overlapping, settlement.getId());
        lineItems.saveAll(built);
        lineItems.flush();

        LineTotals totals = lineItems.totals(settlement.getId());
        OrderTotals source = orders.totals(partnerId, period.startDateTime(), period.endExclusiveDateTime());
        if (!totals.orderCount().equals(source.orderCount())
                || totals.grandTotal().compareTo(source.grandTotal()) != 0
                || totals.tax().compareTo(source.tax()) != 0) {
            throw PartnerFinanceException.conflict("settlement_source_changed_retry");
        }
        settlement.setOrderCount(totals.orderCount().intValue());
        settlement.setEligibleOrderCount(totals.eligibleOrderCount().intValue());
        settlement.setGrossSales(MoneyService.amount(totals.gross()));
        settlement.setDiscountTotal(MoneyService.amount(totals.discount()));
        settlement.setTaxTotal(MoneyService.amount(totals.tax()));
        settlement.setRefundTotal(MoneyService.amount(totals.refund()));
        settlement.setOrderGrandTotal(MoneyService.amount(totals.grandTotal()));
        settlement.setNetSales(MoneyService.amount(totals.net()));
        settlement.setEligibleSales(MoneyService.amount(lineItems.eligibleNetSales(settlement.getId())));
        settlement.setCommissionBasisTotal(MoneyService.amount(totals.basis()));
        settlement.setCommissionAmount(MoneyService.amount(totals.commission()));
        settlement.setTaxTreatment(overlapping.get(overlapping.size() - 1).getTaxTreatment());
        settlement.setRefundDataAvailable(calculator.refundDataAvailable());
        settlement.setCalculationCount(settlement.getCalculationCount() + 1);
        settlement.setCalculatedAt(clock.now());
        refreshAdjustments(settlement);
        if (first) {
            settlement.transitionTo(SettlementStatus.CALCULATED);
        }
        settlements.saveAndFlush(settlement);
        audit.record(partnerId, FinanceEntityType.SETTLEMENT, settlement.getId(),
                first ? "CALCULATED" : "RECALCULATED", actor, previous, describe(settlement), null);
    }

    private void refreshAdjustments(PartnerSettlement settlement) {
        BigDecimal total = MoneyService.amount(adjustments.sumBySettlementId(settlement.getId()));
        settlement.setAdjustmentTotal(total);
        settlement.setNetPayable(MoneyService.amount(settlement.getCommissionAmount().add(total)));
    }

    /** Approval is only valid if a fresh calculation still matches what was calculated and reviewed. */
    private void requireNotStale(PartnerSettlement settlement, SettlementPeriod period) {
        Long partnerId = settlement.getPartner().getId();
        SettlementTotals fresh = SettlementTotals.of(
                calculator.calculate(partnerId, period, overlappingAgreements(partnerId, period), null));
        boolean same = fresh.orderCount() == settlement.getOrderCount()
                && fresh.gross().compareTo(settlement.getGrossSales()) == 0
                && fresh.grandTotal().compareTo(settlement.getOrderGrandTotal()) == 0
                && fresh.tax().compareTo(settlement.getTaxTotal()) == 0
                && fresh.refund().compareTo(settlement.getRefundTotal()) == 0
                && fresh.net().compareTo(settlement.getNetSales()) == 0
                && fresh.commission().compareTo(settlement.getCommissionAmount()) == 0;
        if (!same) {
            throw PartnerFinanceException.conflict("settlement_stale_recalculate_required");
        }
    }

    private List<PartnerCommissionAgreement> overlappingAgreements(Long partnerId, SettlementPeriod period) {
        return agreementService.activeAgreements(partnerId).stream()
                .filter(a -> a.overlaps(period.start(), period.end())).toList();
    }

    private FinanceActor requireAdmin(Authentication authentication) {
        PartnerUser association = access.currentAssociation(authentication);
        if (association.getUser().getRole() != UserRole.PARTNER_ADMIN) {
            throw new AccessDeniedException("partner_admin_required");
        }
        return FinanceActor.of(association.getUser());
    }

    private PartnerSettlement requireOwned(Authentication authentication, Long id) {
        Partner partner = access.getCurrentPartner(authentication);
        return settlements.findByIdAndPartnerId(id, partner.getId())
                .orElseThrow(() -> PartnerFinanceException.notFound("settlement_not_found"));
    }

    private PartnerSettlement lockOwned(Authentication authentication, Long id) {
        Partner partner = access.getCurrentPartner(authentication);
        return settlements.findForUpdate(id, partner.getId())
                .orElseThrow(() -> PartnerFinanceException.notFound("settlement_not_found"));
    }

    private SettlementDetailResponse detailOf(PartnerSettlement settlement) {
        return new SettlementDetailResponse(SettlementResponse.from(settlement),
                adjustments.findBySettlementIdOrderByCreatedAtAscIdAsc(settlement.getId()).stream()
                        .map(AdjustmentResponse::from).toList());
    }

    private static BigDecimal totalFor(List<StatusSummary> rows, SettlementStatus status) {
        return rows.stream().filter(r -> r.status() == status).map(StatusSummary::netPayable)
                .findFirst().orElse(MoneyService.amount(BigDecimal.ZERO));
    }

    static String describe(PartnerSettlement s) {
        return "status=" + s.getStatus() + ";period=" + s.getPeriodStart() + ";orders=" + s.getOrderCount()
                + ";gross=" + s.getGrossSales().toPlainString() + ";net=" + s.getNetSales().toPlainString()
                + ";commission=" + s.getCommissionAmount().toPlainString()
                + ";adjustments=" + s.getAdjustmentTotal().toPlainString()
                + ";netPayable=" + s.getNetPayable().toPlainString();
    }
}
