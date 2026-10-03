package com.broandbro.qrapp.foodcourt.entity;

import com.broandbro.qrapp.foodcourt.enums.AdjustmentType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * An append-only adjustment applied to a rent invoice (discount, waiver, late
 * fee or correction). {@link #amount} is signed: negative reduces what is owed,
 * positive increases it. Historical adjustments are never edited or deleted.
 */
@Entity
@Table(name = "fc_rent_adjustments")
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
public class RentAdjustment extends FoodCourtBaseEntity {

    @Column(name = "food_court_id", nullable = false)
    private UUID foodCourtId;

    @Column(name = "rent_invoice_id", nullable = false)
    private UUID rentInvoiceId;

    @Enumerated(EnumType.STRING)
    @Column(name = "adjustment_type", nullable = false, length = 20)
    private AdjustmentType adjustmentType;

    /** Signed amount applied to the invoice net total. */
    @Column(name = "amount", nullable = false, precision = 14, scale = 2)
    private BigDecimal amount;

    @Column(name = "reason", length = 255)
    private String reason;

    /** Opaque user id of whoever applied the adjustment. */
    @Column(name = "applied_by", length = 100)
    private String appliedBy;
}
