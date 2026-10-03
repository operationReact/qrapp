package com.broandbro.qrapp.foodcourt.entity;

import com.broandbro.qrapp.foodcourt.enums.DepositStatus;
import com.broandbro.qrapp.foodcourt.enums.DepositType;
import com.broandbro.qrapp.foodcourt.enums.LeaseType;
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
 * A deposit or asset consideration held against a stall or property lease.
 * {@link #refundedAmount} tracks partial settlement; the original
 * {@link #amount} is never rewritten so the historical figure is preserved.
 */
@Entity
@Table(name = "fc_deposits")
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
public class Deposit extends FoodCourtBaseEntity {

    @Column(name = "food_court_id", nullable = false)
    private UUID foodCourtId;

    @Enumerated(EnumType.STRING)
    @Column(name = "lease_type", nullable = false, length = 20)
    private LeaseType leaseType;

    /** Stall lease or property lease this deposit is held against (nullable). */
    @Column(name = "lease_id")
    private UUID leaseId;

    /** Tenant the deposit was received from, when applicable. */
    @Column(name = "tenant_id")
    private UUID tenantId;

    @Enumerated(EnumType.STRING)
    @Column(name = "deposit_type", nullable = false, length = 30)
    private DepositType depositType;

    @Column(name = "amount", nullable = false, precision = 14, scale = 2)
    private BigDecimal amount;

    @Column(name = "refunded_amount", nullable = false, precision = 14, scale = 2)
    private BigDecimal refundedAmount;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private DepositStatus status;

    /** Nullable: unknown for legacy records. */
    @Column(name = "received_date")
    private LocalDate receivedDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", length = 20)
    private PaymentMethod paymentMethod;

    /** Free-form description of the consideration (e.g. equipment handed over). */
    @Column(name = "asset_description", columnDefinition = "TEXT")
    private String assetDescription;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;
}
