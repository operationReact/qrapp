package com.broandbro.qrapp.partnerfinance.dto;

import com.broandbro.qrapp.partnerfinance.entity.PartnerCommissionAgreement;
import com.broandbro.qrapp.partnerfinance.enums.AgreementStatus;
import com.broandbro.qrapp.partnerfinance.enums.CommissionBasis;
import com.broandbro.qrapp.partnerfinance.enums.CommissionType;
import com.broandbro.qrapp.partnerfinance.enums.TaxTreatment;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

public final class AgreementDtos {
    private AgreementDtos() {
    }

    /** Partner-facing view: commercial terms only, no internal notes or actor details. */
    public record PartnerAgreementResponse(Long id, CommissionType commissionType, CommissionBasis commissionBasis,
                                           BigDecimal ratePercent, LocalDate effectiveFrom, LocalDate effectiveTo,
                                           TaxTreatment taxTreatment, AgreementStatus status, boolean currentlyEffective) {
        public static PartnerAgreementResponse from(PartnerCommissionAgreement a, LocalDate today) {
            return new PartnerAgreementResponse(a.getId(), a.getCommissionType(), a.getCommissionBasis(),
                    a.getRatePercent(), a.getEffectiveFrom(), a.getEffectiveTo(), a.getTaxTreatment(),
                    a.getStatus(), a.covers(today));
        }
    }

    public record AdminAgreementResponse(Long id, Long partnerId, CommissionType commissionType,
                                         CommissionBasis commissionBasis, BigDecimal ratePercent,
                                         LocalDate effectiveFrom, LocalDate effectiveTo, TaxTreatment taxTreatment,
                                         AgreementStatus status, String notes, String voidReason,
                                         Instant createdAt, String createdBy, Instant updatedAt, String updatedBy) {
        public static AdminAgreementResponse from(PartnerCommissionAgreement a) {
            return new AdminAgreementResponse(a.getId(), a.getPartner().getId(), a.getCommissionType(),
                    a.getCommissionBasis(), a.getRatePercent(), a.getEffectiveFrom(), a.getEffectiveTo(),
                    a.getTaxTreatment(), a.getStatus(), a.getNotes(), a.getVoidReason(), a.getCreatedAt(),
                    a.getCreatedBy(), a.getUpdatedAt(), a.getUpdatedBy());
        }
    }

    public record CreateAgreementRequest(
            CommissionType commissionType,
            @NotNull CommissionBasis commissionBasis,
            @NotNull @DecimalMin(value = "0.0001") @DecimalMax("100") @Digits(integer = 3, fraction = 4) BigDecimal ratePercent,
            @NotNull LocalDate effectiveFrom,
            LocalDate effectiveTo,
            TaxTreatment taxTreatment,
            @Size(max = 500) String notes) {
    }

    public record EndAgreementRequest(@NotNull LocalDate effectiveTo,
                                      @NotBlank @Size(min = 3, max = 500) String reason) {
    }

    public record VoidAgreementRequest(@NotBlank @Size(min = 3, max = 500) String reason) {
    }
}