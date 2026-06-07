package com.broandbro.qrapp.analytics.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Materialised per-item sales snapshot (daily granularity).
 *
 * <p>One row per (menu_item_id, snapshot_date). Allows tracking of item-level
 * popularity trends over time without scanning order_items on every request.
 * Populated by {@code MenuItemSnapshotScheduler}.</p>
 *
 * <p>Table: {@code analytics_menu_item}</p>
 */
@Entity
@Table(
    name = "analytics_menu_item",
    uniqueConstraints = {
        @UniqueConstraint(
            name = "uq_analytics_menu_item_date",
            columnNames = {"menu_item_id", "snapshot_date"}
        )
    },
    indexes = {
        @Index(name = "idx_ami_snapshot_date",   columnList = "snapshot_date DESC"),
        @Index(name = "idx_ami_menu_item_id",    columnList = "menu_item_id"),
        @Index(name = "idx_ami_total_qty",       columnList = "total_qty_sold DESC"),
        @Index(name = "idx_ami_total_revenue",   columnList = "total_revenue DESC"),
        @Index(name = "idx_ami_category_id",     columnList = "category_id"),
        @Index(name = "idx_ami_item_date",       columnList = "menu_item_id, snapshot_date")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MenuItemAnalytics {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** FK to {@code menu_items.id}. Not a JPA association — avoids N+1 on analytics reads. */
    @Column(name = "menu_item_id", nullable = false)
    private Long menuItemId;

    /** Denormalised for read performance; updated on item rename. */
    @Column(name = "menu_item_name", nullable = false, length = 255)
    private String menuItemName;

    /** Denormalised category id for category-level rollups. */
    @Column(name = "category_id")
    private Long categoryId;

    /** Denormalised category name. */
    @Column(name = "category_name", length = 100)
    private String categoryName;

    /** Date this snapshot covers. */
    @Column(name = "snapshot_date", nullable = false)
    private LocalDate snapshotDate;

    /** Total units sold on this date. */
    @Column(name = "total_qty_sold", nullable = false)
    private Integer totalQtySold;

    /** Gross revenue = qty × selling_price at time of order. */
    @Column(name = "total_revenue", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalRevenue;

    /** Number of distinct orders containing this item. */
    @Column(name = "order_count", nullable = false)
    private Integer orderCount;

    /** Average selling price across all orders on this date. */
    @Column(name = "avg_selling_price", precision = 10, scale = 2)
    private BigDecimal avgSellingPrice;

    /**
     * Rank by revenue among all items on this snapshot_date.
     * 1 = highest revenue. Computed by the scheduler using RANK() window function.
     */
    @Column(name = "revenue_rank")
    private Integer revenueRank;

    /**
     * Rank by quantity among all items on this snapshot_date.
     */
    @Column(name = "qty_rank")
    private Integer qtyRank;

    // ============================================================================
    // PROFITABILITY TRACKING FIELDS
    // ============================================================================

    /**
     * Total estimated cost = qty × COALESCE(cost_price_snapshot, estimated_cost, 0).
     */
    @Column(name = "total_cost", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal totalCost = BigDecimal.ZERO;

    /** total_revenue - total_cost. */
    @Column(name = "total_profit", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal totalProfit = BigDecimal.ZERO;

    /** Weighted average cost per unit sold on this date. Null when qty = 0. */
    @Column(name = "avg_cost_price", precision = 10, scale = 2)
    private BigDecimal avgCostPrice;

    /** Profit margin % = (total_profit / total_revenue) × 100. Null when revenue = 0. */
    @Column(name = "avg_profit_margin", precision = 8, scale = 4)
    private BigDecimal avgProfitMargin;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}

