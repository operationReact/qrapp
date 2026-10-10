package com.broandbro.qrapp.partnerfinance.service;

import com.broandbro.qrapp.entity.Partner;
import com.broandbro.qrapp.partnerfinance.dto.AgreementDtos.*;
import com.broandbro.qrapp.partnerfinance.engine.FinanceClock;
import com.broandbro.qrapp.partnerfinance.entity.PartnerCommissionAgreement;
import com.broandbro.qrapp.partnerfinance.enums.*;
import com.broandbro.qrapp.partnerfinance.exception.PartnerFinanceException;
import com.broandbro.qrapp.partnerfinance.repository.PartnerCommissionAgreementRepository;
import com.broandbro.qrapp.partnerfinance.repository.PartnerFinanceLockRepository;
import com.broandbro.qrapp.partnerfinance.repository.PartnerSettlementRepository;
import com.broandbro.qrapp.service.PartnerAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;

/**
 * Effective-dated commission agreements. Terms are immutable once created; an agreement can only be
 * shortened or voided, and never in a way that changes an APPROVED/PAID settlement.
 */
@Service
@RequiredArgsConstructor
public class PartnerAgreementService {
    static final LocalDate OPEN_END = LocalDate.of(9999, 12, 31);
    private static final Set<SettlementStatus> FINAL_STATUSES = Set.of(SettlementStatus.APPROVED, SettlementStatus.PAID);

    private final PartnerCommissionAgreementRepository agreements;
    private final PartnerSettlementRepository settlements;
    private final PartnerFinanceLockRepository partners;
    private final PartnerAccessService access;
    private final FinanceAuditService audit;
    private final FinanceClock clock;

    @Transactional(readOnly = true)
    public List<PartnerAgreementResponse> listForPartner(Authentication authentication) {
        Partner partner = access.getCurrentPartner(authentication);
        LocalDate today = clock.today();
        return agreements.findByPartnerIdOrderByEffectiveFromDescIdDesc(partner.getId()).stream()
                .filter(a -> a.getStatus() == AgreementStatus.ACTIVE)
                .map(a -> PartnerAgreementResponse.from(a, today)).toList();
    }

    @Transactional(readOnly = true)
    public PartnerAgreementResponse currentForPartner(Authentication authentication) {
        Partner partner = access.getCurrentPartner(authentication);
        LocalDate today = clock.today();
        return agreements.findByPartnerIdAndStatusOrderByEffectiveFromAscIdAsc(partner.getId(), AgreementStatus.ACTIVE)
                .stream().filter(a -> a.covers(today)).findFirst()
                .map(a -> PartnerAgreementResponse.from(a, today))
                .orElseThrow(() -> PartnerFinanceException.notFound("no_current_commission_agreement"));
    }

    @Transactional(readOnly = true)
    public List<AdminAgreementResponse> listForAdmin(Long partnerId) {
        partners.findPartner(partnerId).orElseThrow(() -> PartnerFinanceException.notFound("partner_not_found"));
        return agreements.findByPartnerIdOrderByEffectiveFromDescIdDesc(partnerId).stream()
                .map(AdminAgreementResponse::from).toList();
    }

    @Transactional
    public AdminAgreementResponse create(Long partnerId, CreateAgreementRequest request, Authentication authentication) {
        FinanceActor actor = FinanceActor.of(access.currentUser(authentication));
        Partner partner = partners.lockPartner(partnerId)
                .orElseThrow(() -> PartnerFinanceException.notFound("partner_not_found"));
        if (request.effectiveTo() != null && request.effectiveTo().isBefore(request.effectiveFrom())) {
            throw PartnerFinanceException.validation("agreement_end_before_start");
        }
        CommissionType type = request.commissionType() == null ? CommissionType.PERCENTAGE : request.commissionType();
        for (PartnerCommissionAgreement existing : agreements
                .findByPartnerIdAndStatusOrderByEffectiveFromAscIdAsc(partnerId, AgreementStatus.ACTIVE)) {
            if (existing.overlaps(request.effectiveFrom(), request.effectiveTo())) {
                throw PartnerFinanceException.conflict("agreement_period_overlaps");
            }
        }
        requireNoFinalSettlement(partnerId, request.effectiveFrom(), request.effectiveTo());

        PartnerCommissionAgreement saved = agreements.save(PartnerCommissionAgreement.builder()
                .partner(partner)
                .commissionType(type)
                .commissionBasis(request.commissionBasis())
                .ratePercent(request.ratePercent())
                .effectiveFrom(request.effectiveFrom())
                .effectiveTo(request.effectiveTo())
                .taxTreatment(request.taxTreatment() == null ? TaxTreatment.DEFERRED : request.taxTreatment())
                .status(AgreementStatus.ACTIVE)
                .notes(blankToNull(request.notes()))
                .createdBy(actor.name())
                .updatedBy(actor.name())
                .build());
        audit.record(partnerId, FinanceEntityType.AGREEMENT, saved.getId(), "AGREEMENT_CREATED", actor,
                null, describe(saved), null);
        return AdminAgreementResponse.from(saved);
    }

    @Transactional
    public AdminAgreementResponse end(Long partnerId, Long agreementId, EndAgreementRequest request,
                                      Authentication authentication) {
        FinanceActor actor = FinanceActor.of(access.currentUser(authentication));
        partners.lockPartner(partnerId).orElseThrow(() -> PartnerFinanceException.notFound("partner_not_found"));
        PartnerCommissionAgreement agreement = load(partnerId, agreementId);
        LocalDate newEnd = request.effectiveTo();
        if (agreement.getStatus() != AgreementStatus.ACTIVE) {
            throw PartnerFinanceException.conflict("agreement_not_active");
        }
        if (newEnd.isBefore(agreement.getEffectiveFrom())) {
            throw PartnerFinanceException.validation("agreement_end_before_start");
        }
        if (agreement.getEffectiveTo() != null && !newEnd.isBefore(agreement.getEffectiveTo())) {
            throw PartnerFinanceException.validation("agreement_end_must_shorten");
        }
        requireNoFinalSettlement(partnerId, newEnd.plusDays(1),
                agreement.getEffectiveTo() == null ? null : agreement.getEffectiveTo());
        String previous = describe(agreement);
        agreement.setEffectiveTo(newEnd);
        agreement.setUpdatedBy(actor.name());
        PartnerCommissionAgreement saved = agreements.save(agreement);
        audit.record(partnerId, FinanceEntityType.AGREEMENT, agreementId, "AGREEMENT_ENDED", actor,
                previous, describe(saved), request.reason());
        return AdminAgreementResponse.from(saved);
    }

    @Transactional
    public AdminAgreementResponse voidAgreement(Long partnerId, Long agreementId, VoidAgreementRequest request,
                                                Authentication authentication) {
        FinanceActor actor = FinanceActor.of(access.currentUser(authentication));
        partners.lockPartner(partnerId).orElseThrow(() -> PartnerFinanceException.notFound("partner_not_found"));
        PartnerCommissionAgreement agreement = load(partnerId, agreementId);
        if (agreement.getStatus() != AgreementStatus.ACTIVE) {
            throw PartnerFinanceException.conflict("agreement_not_active");
        }
        requireNoFinalSettlement(partnerId, agreement.getEffectiveFrom(), agreement.getEffectiveTo());
        String previous = describe(agreement);
        agreement.setStatus(AgreementStatus.VOID);
        agreement.setVoidReason(request.reason().trim());
        agreement.setUpdatedBy(actor.name());
        PartnerCommissionAgreement saved = agreements.save(agreement);
        audit.record(partnerId, FinanceEntityType.AGREEMENT, agreementId, "AGREEMENT_VOIDED", actor,
                previous, describe(saved), request.reason());
        return AdminAgreementResponse.from(saved);
    }

    /** Active agreements for a partner, ordered for per-order resolution. */
    @Transactional(readOnly = true)
    public List<PartnerCommissionAgreement> activeAgreements(Long partnerId) {
        return agreements.findByPartnerIdAndStatusOrderByEffectiveFromAscIdAsc(partnerId, AgreementStatus.ACTIVE);
    }

    private PartnerCommissionAgreement load(Long partnerId, Long agreementId) {
        return agreements.findByIdAndPartnerId(agreementId, partnerId)
                .orElseThrow(() -> PartnerFinanceException.notFound("agreement_not_found"));
    }

    private void requireNoFinalSettlement(Long partnerId, LocalDate from, LocalDate toInclusiveOrNull) {
        if (settlements.existsByPartnerIdAndStatusInAndPeriodStartLessThanEqualAndPeriodEndGreaterThanEqual(
                partnerId, FINAL_STATUSES, toInclusiveOrNull == null ? OPEN_END : toInclusiveOrNull, from)) {
            throw PartnerFinanceException.conflict("agreement_overlaps_finalised_settlement");
        }
    }

    static String describe(PartnerCommissionAgreement a) {
        return "status=" + a.getStatus() + ";type=" + a.getCommissionType() + ";basis=" + a.getCommissionBasis()
                + ";rate=" + a.getRatePercent().toPlainString() + ";from=" + a.getEffectiveFrom()
                + ";to=" + (a.getEffectiveTo() == null ? "open" : a.getEffectiveTo())
                + ";tax=" + a.getTaxTreatment();
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
