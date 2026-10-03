package com.broandbro.qrapp.foodcourt.entity;

import com.broandbro.qrapp.foodcourt.enums.TenantStatus;
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

import java.time.Instant;
import java.util.UUID;

/**
 * A tenant occupying (or applying to occupy) a stall. {@link #userId} is an
 * optional opaque reference to a platform user account (never a foreign key)
 * so a tenant may, but need not, map to a login.
 */
@Entity
@Table(name = "fc_tenants")
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
public class Tenant extends FoodCourtBaseEntity {

    @Column(name = "food_court_id", nullable = false)
    private UUID foodCourtId;

    @Column(name = "name", nullable = false, length = 150)
    private String name;

    @Column(name = "business_name", length = 180)
    private String businessName;

    @Column(name = "contact_phone", length = 30)
    private String contactPhone;

    @Column(name = "contact_email", length = 150)
    private String contactEmail;

    /** Opaque platform user id (nullable). Not a DB foreign key. */
    @Column(name = "user_id", length = 100)
    private String userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private TenantStatus status;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "deleted_at")
    private Instant deletedAt;
}
