package com.broandbro.qrapp.partnerfinance.entity;

import com.broandbro.qrapp.entity.Partner;
import com.broandbro.qrapp.partnerfinance.enums.SettlementStatus;
import com.broandbro.qrapp.partnerfinance.enums.TaxTreatment;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "partner_settlement")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PartnerSettlement {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "partner_id", nullable = false, updatable = false)
    private Partner partner;

    @Column(name = "period_start", nullable = false, updatable = false)
    private LocalDate periodStart;

    @Column(name = "period_end", nullable = false, updatable = false)
    private LocalDate periodEnd;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private SettlementStatus status = SettlementStatus.DRAFT;

    @Column(name = "partner_name_snapshot", nullable = false, length = 200, updatable = false)
    private String partnerNameSnapshot;

    @Enumerated(EnumType.STRING)
    @Column(name = "tax_treatment", nullable = false, length = 30)
    @Builder.Default
    private TaxTreatment taxTreatment = TaxTreatment.DEFERRED;

    @Column(name = "order_count", nullable = false)
    @Builder.Default
    private int orderCount = 0;

    @Column(name = "eligible_order_count", nullable = false)
    @Builder.Default
    private int eligibleOrderCount = 0;

    @Column(name = "gross_sales", nullable = false, precision = 19, scale = 2)
    @Builder.Default
    private BigDecimal grossSales = BigDecimal.ZERO;

    @Column(name = "discount_total", nullable = false, precision = 19, scale = 2)
    @Builder.Default
    private BigDecimal discountTotal = BigDecimal.ZERO;

    @Column(name = "tax_total", nullable = false, precision = 19, scale = 2)
    @Builder.Default
    private BigDecimal taxTotal = BigDecimal.ZERO;

    @Column(name = "refund_total", nullable = false, precision = 19, scale = 2)
    @Builder.Default
    private BigDecimal refundTotal = BigDecimal.ZERO;

    @Column(name = "order_grand_total", nullable = false, precision = 19, scale = 2)
    @Builder.Default
    private BigDecimal orderGrandTotal = BigDecimal.ZERO;

    @Column(name = "net_sales", nullable = false, precision = 19, scale = 2)
    @Builder.Default
    private BigDecimal netSales = BigDecimal.ZERO;

    @Column(name = "eligible_sales", nullable = false, precision = 19, scale = 2)
    @Builder.Default
    private BigDecimal eligibleSales = BigDecimal.ZERO;

    @Column(name = "commission_basis_total", nullable = false, precision = 19, scale = 2)
    @Builder.Default
    private BigDecimal commissionBasisTotal = BigDecimal.ZERO;

    @Column(name = "commission_amount", nullable = false, precision = 19, scale = 2)
    @Builder.Default
    private BigDecimal commissionAmount = BigDecimal.ZERO;

    @Column(name = "adjustment_total", nullable = false, precision = 19, scale = 2)
    @Builder.Default
    private BigDecimal adjustmentTotal = BigDecimal.ZERO;

    /** Amount payable to the partner: commission_amount + adjustment_total. */
    @Column(name = "net_payable", nullable = false, precision = 19, scale = 2)
    @Builder.Default
    private BigDecimal netPayable = BigDecimal.ZERO;

    @Column(name = "refund_data_available", nullable = false)
    private boolean refundDataAvailable;

    @Column(name = "calculation_count", nullable = false)
    private int calculationCount;

    @Column(name = "calculated_at")
    private Instant calculatedAt;

    @Column(name = "approved_at")
    private Instant approvedAt;

    @Column(name = "approved_by", length = 160)
    private String approvedBy;

    @Column(name = "paid_at")
    private Instant paidAt;

    @Column(name = "paid_by", length = 160)
    private String paidBy;

    @Column(name = "paid_on")
    private LocalDate paidOn;

    @Column(name = "payment_reference", length = 100)
    private String paymentReference;

    @Column(name = "payment_note", length = 500)
    private String paymentNote;

    @Column(name = "voided_at")
    private Instant voidedAt;

    @Column(name = "voided_by", length = 160)
    private String voidedBy;

    @Column(name = "void_reason", length = 500)
    private String voidReason;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "created_by", length = 160, updatable = false)
    private String createdBy;

    @Version
    private Long version;

    /** Validates and applies a lifecycle transition. */
    public void transitionTo(SettlementStatus next) {
        if (!status.canTransitionTo(next)) {
            throw com.broandbro.qrapp.partnerfinance.exception.PartnerFinanceException
                    .conflict("invalid_settlement_transition");
        }
        status = next;
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