package com.broandbro.qrapp.analytics.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Materialised per-user behavioural snapshot.
 *
 * <p>One row per user — updated incrementally by {@code UserActivitySnapshotScheduler}.
 * Drives customer segmentation (new / repeat / churned) and personalisation.</p>
 *
 * <p>Table: {@code analytics_user_preference}</p>
 */
@Entity
@Table(
    name = "analytics_user_preference",
    uniqueConstraints = {
        @UniqueConstraint(name = "uq_analytics_user_pref_user_id", columnNames = "user_id")
    },
    indexes = {
        @Index(name = "idx_aup_user_id",           columnList = "user_id"),
        @Index(name = "idx_aup_total_orders",      columnList = "total_orders DESC"),
        @Index(name = "idx_aup_lifetime_spend",    columnList = "lifetime_spend DESC"),
        @Index(name = "idx_aup_last_order_at",     columnList = "last_order_at DESC"),
        @Index(name = "idx_aup_customer_segment",  columnList = "customer_segment"),
        @Index(name = "idx_aup_is_churned",        columnList = "is_churned")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserPreferenceAnalytics {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** FK to {@code users.id}. Not a JPA association to avoid eager loading. */
    @Column(name = "user_id", nullable = false)
    private Long userId;

    /** Denormalised phone for quick lookups without joining users table. */
    @Column(name = "phone", nullable = false, length = 20)
    private String phone;

    // ── Order metrics ──────────────────────────────────────────────────────────

    /** Lifetime count of all orders (any status). */
    @Column(name = "total_orders", nullable = false)
    private Integer totalOrders;

    /** Count of orders that reached COMPLETED status. */
    @Column(name = "completed_orders", nullable = false)
    private Integer completedOrders;

    /** Count of CANCELLED orders. */
    @Column(name = "cancelled_orders", nullable = false)
    private Integer cancelledOrders;

    // ── Spend metrics ──────────────────────────────────────────────────────────

    /** Total amount paid across all completed orders. */
    @Column(name = "lifetime_spend", nullable = false, precision = 12, scale = 2)
    private BigDecimal lifetimeSpend;

    /** Average order value = lifetime_spend / completed_orders. */
    @Column(name = "avg_order_value", precision = 10, scale = 2)
    private BigDecimal avgOrderValue;

    /** Highest single order value. */
    @Column(name = "max_order_value", precision = 10, scale = 2)
    private BigDecimal maxOrderValue;

    // ── Temporal metrics ───────────────────────────────────────────────────────

    @Column(name = "first_order_at")
    private LocalDateTime firstOrderAt;

    @Column(name = "last_order_at")
    private LocalDateTime lastOrderAt;

    /**
     * Average days between consecutive orders.
     * NULL if the user has placed only one order.
     */
    @Column(name = "avg_order_frequency_days", precision = 6, scale = 2)
    private BigDecimal avgOrderFrequencyDays;

    // ── Preference signals ────────────────────────────────────────────────────

    /**
     * JSON array of top-3 category IDs by order frequency.
     * Example: {@code [3, 1, 7]}
     */
    @Column(name = "preferred_category_ids", columnDefinition = "TEXT")
    private String preferredCategoryIds;

    /**
     * JSON array of top-3 menu item IDs by order frequency.
     */
    @Column(name = "preferred_item_ids", columnDefinition = "TEXT")
    private String preferredItemIds;

    // ── Segmentation ──────────────────────────────────────────────────────────

    /**
     * RFM-derived customer segment.
     * Possible values: NEW, OCCASIONAL, REGULAR, VIP, AT_RISK, CHURNED.
     */
    @Column(name = "customer_segment", length = 20)
    private String customerSegment;

    /**
     * True if the user has not placed an order in the last 30 days.
     */
    @Column(name = "is_churned", nullable = false)
    @Builder.Default
    private Boolean isChurned = false;

    /** Number of coupons redeemed by this user. */
    @Column(name = "coupons_used", nullable = false)
    @Builder.Default
    private Integer couponsUsed = 0;

    /** Total coupon discount received. */
    @Column(name = "total_coupon_discount", nullable = false, precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal totalCouponDiscount = BigDecimal.ZERO;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}

