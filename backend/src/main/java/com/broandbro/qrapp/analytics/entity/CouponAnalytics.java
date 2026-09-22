package com.broandbro.qrapp.analytics.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Materialised per-coupon performance snapshot (daily granularity).
 *
 * <p>One row per (coupon_code, snapshot_date). Enables ROI analysis,
 * abuse detection, and effectiveness comparison across campaigns.
 * Populated by {@code CouponAnalyticsScheduler}.</p>
 *
 * <p>Table: {@code analytics_coupon}</p>
 */
@Entity
@Table(
    name = "analytics_coupon",
    uniqueConstraints = {
        @UniqueConstraint(
            name = "uq_analytics_coupon_code_date_location",
            columnNames = {"coupon_code", "snapshot_date", "location_id"}
        )
    },
    indexes = {
        @Index(name = "idx_ac_snapshot_date",     columnList = "snapshot_date DESC"),
        @Index(name = "idx_ac_coupon_code",       columnList = "coupon_code"),
        @Index(name = "idx_ac_coupon_id",         columnList = "coupon_id"),
        @Index(name = "idx_ac_total_redemptions", columnList = "total_redemptions DESC"),
        @Index(name = "idx_ac_total_discount",    columnList = "total_discount_given DESC"),
        @Index(name = "idx_ac_code_date",         columnList = "coupon_code, snapshot_date"),
        @Index(name = "idx_ac_location_date",     columnList = "location_id, snapshot_date DESC")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CouponAnalytics {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** FK to {@code coupon.id}. Stored for joins when needed. */
    @Column(name = "coupon_id", nullable = false)
    private Long couponId;

    /** Denormalised coupon code — primary lookup key for analytics. */
    @Column(name = "coupon_code", nullable = false, length = 50)
    private String couponCode;

    /** Location where the coupon was redeemed. Snapshots are per (code, date, location). */
    @Column(name = "location_id", nullable = false)
    private Long locationId;

    /** Date this snapshot covers. */
    @Column(name = "snapshot_date", nullable = false)
    private LocalDate snapshotDate;

    // ── Usage metrics ─────────────────────────────────────────────────────────

    /** Times the coupon was applied to an order (any status). */
    @Column(name = "total_redemptions", nullable = false)
    private Integer totalRedemptions;

    /** Redemptions where the order reached COMPLETED. */
    @Column(name = "successful_redemptions", nullable = false)
    private Integer successfulRedemptions;

    /** Redemptions where the order was CANCELLED (wasted discount). */
    @Column(name = "cancelled_redemptions", nullable = false)
    private Integer cancelledRedemptions;

    /** Distinct user count that used this coupon on this date. */
    @Column(name = "unique_users", nullable = false)
    private Integer uniqueUsers;

    // ── Financial metrics ─────────────────────────────────────────────────────

    /** Total discount amount given for completed orders. */
    @Column(name = "total_discount_given", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalDiscountGiven;

    /** Total revenue generated from orders that used this coupon. */
    @Column(name = "total_revenue_generated", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalRevenueGenerated;

    /** Average order value for orders using this coupon. */
    @Column(name = "avg_order_value", precision = 10, scale = 2)
    private BigDecimal avgOrderValue;

    /**
     * Discount cost ratio = total_discount_given / total_revenue_generated × 100.
     * Stored as a percentage (e.g. 12.50 = 12.5%).
     */
    @Column(name = "discount_cost_ratio", precision = 6, scale = 2)
    private BigDecimal discountCostRatio;

    // ── Abuse detection signals ───────────────────────────────────────────────

    /**
     * Count of users who used this coupon more than once on this date.
     * Non-zero value signals potential abuse of single-use coupons.
     */
    @Column(name = "repeat_user_count", nullable = false)
    @Builder.Default
    private Integer repeatUserCount = 0;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}

