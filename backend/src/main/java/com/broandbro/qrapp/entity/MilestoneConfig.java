package com.broandbro.qrapp.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Admin-configurable milestone definition.
 * Each row represents one spending threshold and the reward issued when crossed.
 */
@Entity
@Table(name = "milestone_config")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MilestoneConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Lifetime spend threshold, e.g. 500, 1000, 2500 */
    @Column(name = "threshold_amount", nullable = false, unique = true, precision = 10, scale = 2)
    private BigDecimal thresholdAmount;

    /** Percentage discount awarded, e.g. 10 = 10% */
    @Column(name = "discount_pct", nullable = false, precision = 5, scale = 2)
    private BigDecimal discountPct;

    /** Maximum discount cap in ₹, e.g. 150 */
    @Column(name = "max_cap", nullable = false, precision = 10, scale = 2)
    private BigDecimal maxCap;

    /** Days the issued coupon stays valid */
    @Column(name = "validity_days", nullable = false)
    private Integer validityDays;

    /** If false, this milestone is skipped (no coupon issued) */
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (isActive == null) isActive = true;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}

