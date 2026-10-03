package com.broandbro.qrapp.foodcourt.entity;

import com.broandbro.qrapp.foodcourt.enums.LeaseStatus;
import com.broandbro.qrapp.foodcourt.enums.PaymentMethod;
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
 * Sub-lease of a single stall to a tenant. At most one lease per stall may be
 * {@link LeaseStatus#ACTIVE} with an overlapping date range — enforced by the
 * service layer and a partial unique index. Stall occupancy is derived from
 * the existence of such an active lease. {@link #monthlyRent} is the agreed
 * figure used to generate rent invoices, each of which snapshots the amount so
 * later rent changes never rewrite history.
 */
@Entity
@Table(name = "fc_stall_leases")
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
public class StallLease extends FoodCourtBaseEntity {

    @Column(name = "food_court_id", nullable = false)
    private UUID foodCourtId;

    @Column(name = "stall_id", nullable = false)
    private UUID stallId;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    /** Open-ended leases leave this null. */
    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "monthly_rent", nullable = false, precision = 14, scale = 2)
    private BigDecimal monthlyRent;

    @Column(name = "deposit_amount", precision = 14, scale = 2)
    private BigDecimal depositAmount;

    /** Day of month (1-28) rent is due. Defaults applied by the service. */
    @Column(name = "rent_due_day", nullable = false)
    private Integer rentDueDay;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", length = 20)
    private PaymentMethod paymentMethod;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private LeaseStatus status;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;
}
