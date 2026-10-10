package com.broandbro.qrapp.partnerfinance.entity;

import com.broandbro.qrapp.entity.Partner;
import com.broandbro.qrapp.partnerfinance.enums.AgreementStatus;
import com.broandbro.qrapp.partnerfinance.enums.CommissionBasis;
import com.broandbro.qrapp.partnerfinance.enums.CommissionType;
import com.broandbro.qrapp.partnerfinance.enums.TaxTreatment;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "partner_commission_agreement")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PartnerCommissionAgreement {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "partner_id", nullable = false, updatable = false)
    private Partner partner;

    @Enumerated(EnumType.STRING)
    @Column(name = "commission_type", nullable = false, updatable = false, length = 30)
    @Builder.Default
    private CommissionType commissionType = CommissionType.PERCENTAGE;

    @Enumerated(EnumType.STRING)
    @Column(name = "commission_basis", nullable = false, updatable = false, length = 30)
    private CommissionBasis commissionBasis;

    @Column(name = "rate_percent", nullable = false, updatable = false, precision = 7, scale = 4)
    private BigDecimal ratePercent;

    @Column(name = "effective_from", nullable = false, updatable = false)
    private LocalDate effectiveFrom;

    /** Inclusive; null means open ended. Only ever shortened, never extended. */
    @Column(name = "effective_to")
    private LocalDate effectiveTo;

    @Enumerated(EnumType.STRING)
    @Column(name = "tax_treatment", nullable = false, length = 30)
    @Builder.Default
    private TaxTreatment taxTreatment = TaxTreatment.DEFERRED;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private AgreementStatus status = AgreementStatus.ACTIVE;

    @Column(length = 500)
    private String notes;

    @Column(name = "void_reason", length = 500)
    private String voidReason;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "created_by", length = 160, updatable = false)
    private String createdBy;

    @Column(name = "updated_by", length = 160)
    private String updatedBy;

    @Version
    private Long version;

    public boolean covers(LocalDate date) {
        return status == AgreementStatus.ACTIVE
                && !date.isBefore(effectiveFrom)
                && (effectiveTo == null || !date.isAfter(effectiveTo));
    }

    public boolean overlaps(LocalDate from, LocalDate toInclusiveOrNull) {
        return (toInclusiveOrNull == null || !effectiveFrom.isAfter(toInclusiveOrNull))
                && (effectiveTo == null || !effectiveTo.isBefore(from));
    }

    @PrePersist
    void prePersist() {
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = Instant.now();
    }
}