package com.broandbro.qrapp.foodcourt.entity;

import com.broandbro.qrapp.foodcourt.enums.RentInvoiceStatus;
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
import java.time.LocalDate;
import java.util.UUID;

/**
 * A generated monthly rent charge for a stall lease. Exactly one invoice may
 * exist per (lease, period year, period month) — duplicate-month generation is
 * rejected by a unique constraint. {@link #rentAmount} snapshots the lease rent
 * at generation time so later rent changes never rewrite historical charges;
 * adjustments are recorded separately and summed into {@link #netAmount}.
 */
@Entity
@Table(name = "fc_rent_invoices")
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
public class RentInvoice extends FoodCourtBaseEntity {

    @Column(name = "food_court_id", nullable = false)
    private UUID foodCourtId;

    @Column(name = "stall_lease_id", nullable = false)
    private UUID stallLeaseId;

    @Column(name = "stall_id", nullable = false)
    private UUID stallId;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "period_year", nullable = false)
    private Integer periodYear;

    /** 1-12. */
    @Column(name = "period_month", nullable = false)
    private Integer periodMonth;

    @Column(name = "due_date", nullable = false)
    private LocalDate dueDate;

    /** Snapshot of the lease rent at generation (preserved, never rewritten). */
    @Column(name = "rent_amount", nullable = false, precision = 14, scale = 2)
    private BigDecimal rentAmount;

    /** Sum of applied adjustments (may be negative). */
    @Column(name = "adjustment_total", nullable = false, precision = 14, scale = 2)
    private BigDecimal adjustmentTotal;

    /** rent_amount + adjustment_total; the amount actually owed. */
    @Column(name = "net_amount", nullable = false, precision = 14, scale = 2)
    private BigDecimal netAmount;

    @Column(name = "amount_paid", nullable = false, precision = 14, scale = 2)
    private BigDecimal amountPaid;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private RentInvoiceStatus status;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;
}
