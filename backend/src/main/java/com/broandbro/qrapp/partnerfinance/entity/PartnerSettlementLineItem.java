package com.broandbro.qrapp.partnerfinance.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Immutable;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;

/** One completed order inside a settlement. Written once; never updated. */
@Entity
@Immutable
@Table(name = "partner_settlement_line_item")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class PartnerSettlementLineItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "settlement_id", nullable = false)
    private Long settlementId;

    @Column(name = "partner_id", nullable = false)
    private Long partnerId;

    @Column(name = "order_id", nullable = false)
    private Long orderId;

    @Column(name = "order_number", length = 50)
    private String orderNumber;

    @Column(name = "location_id", nullable = false)
    private Long locationId;

    @Column(name = "location_code", length = 80)
    private String locationCode;

    @Column(name = "location_name", length = 255)
    private String locationName;

    @Column(name = "completed_at", nullable = false)
    private LocalDateTime completedAt;

    @Column(name = "agreement_id")
    private Long agreementId;

    @Column(name = "commission_basis", length = 30)
    private String commissionBasis;

    @Column(name = "rate_percent", precision = 7, scale = 4)
    private BigDecimal ratePercent;

    @Column(name = "gross_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal grossAmount;

    @Column(name = "discount_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal discountAmount;

    @Column(name = "tax_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal taxAmount;

    @Column(name = "grand_total", nullable = false, precision = 19, scale = 2)
    private BigDecimal grandTotal;

    @Column(name = "refund_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal refundAmount;

    @Column(name = "refund_net_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal refundNetAmount;

    @Column(name = "net_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal netAmount;

    @Column(nullable = false)
    private boolean eligible;

    @Column(name = "exclusion_reason", length = 40)
    private String exclusionReason;

    @Column(name = "basis_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal basisAmount;

    @Column(name = "commission_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal commissionAmount;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = Instant.now();
    }
}