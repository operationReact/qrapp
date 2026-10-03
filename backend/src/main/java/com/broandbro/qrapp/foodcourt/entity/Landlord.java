package com.broandbro.qrapp.foodcourt.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.time.Instant;
import java.util.UUID;

/**
 * The landlord / property owner from whom the operator leases a food court
 * building. One or more {@link PropertyLease} rows link a landlord to a food
 * court over time.
 */
@Entity
@Table(name = "fc_landlords")
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
public class Landlord extends FoodCourtBaseEntity {

    @Column(name = "food_court_id", nullable = false)
    private UUID foodCourtId;

    @Column(name = "name", nullable = false, length = 150)
    private String name;

    @Column(name = "contact_phone", length = 30)
    private String contactPhone;

    @Column(name = "contact_email", length = 150)
    private String contactEmail;

    @Column(name = "address_line", length = 255)
    private String addressLine;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "deleted_at")
    private Instant deletedAt;
}
