package com.broandbro.qrapp.foodcourt.entity;

import com.broandbro.qrapp.foodcourt.enums.LandlordRentStatus;
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

@Entity
@Table(name = "fc_landlord_rent_obligations")
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
public class LandlordRentObligation extends FoodCourtBaseEntity {
    @Column(name = "food_court_id", nullable = false)
    private UUID foodCourtId;

    @Column(name = "property_lease_id", nullable = false)
    private UUID propertyLeaseId;

    @Column(name = "billing_year", nullable = false)
    private Integer billingYear;

    @Column(name = "billing_month", nullable = false)
    private Integer billingMonth;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Column(name = "expected_amount", nullable = false, precision = 14, scale = 2)
    private BigDecimal expectedAmount;

    @Column(name = "paid_amount", nullable = false, precision = 14, scale = 2)
    private BigDecimal paidAmount;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private LandlordRentStatus status;

    @Column(name = "paid_date")
    private LocalDate paidDate;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;
}
