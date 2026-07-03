package com.broandbro.qrapp.analytics.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Materialised daily sales snapshot.
 *
 * <p>Populated every midnight by {@code DailyRevenueSnapshotScheduler}.
 * Controllers read from this table — never from the live {@code orders} table.</p>
 *
 * <p>Table: {@code analytics_daily_sales}</p>
 */
@Entity
@Table(
    name = "analytics_daily_sales",
    uniqueConstraints = {
        @UniqueConstraint(name = "uq_analytics_daily_sales_date", columnNames = "sales_date")
    },
    indexes = {
        @Index(name = "idx_ads_sales_date",      columnList = "sales_date DESC"),
        @Index(name = "idx_ads_created_at",      columnList = "created_at"),
        @Index(name = "idx_ads_total_revenue",   columnList = "total_revenue DESC")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DailySalesAnalytics {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** The calendar date this snapshot covers. */
    @Column(name = "sales_date", nullable = false)
    private LocalDate salesDate;

    /** Total number of orders placed on this date. */
    @Column(name = "total_orders", nullable = false)
    private Integer totalOrders;

    /** Orders that reached COMPLETED status. */
    @Column(name = "completed_orders", nullable = false)
    private Integer completedOrders;

    /** Orders that were CANCELLED. */
    @Column(name = "cancelled_orders", nullable = false)
    private Integer cancelledOrders;

    /** Gross revenue from all completed orders (in ₹, 2 decimal precision). */
    @Column(name = "total_revenue", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalRevenue;

    /** Revenue after deducting coupon discounts. */
    @Column(name = "net_revenue", nullable = false, precision = 12, scale = 2)
    private BigDecimal netRevenue;

    /** Total coupon discount amount applied on this date. */
    @Column(name = "total_discount", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalDiscount;

    /** Average order value = total_revenue / completed_orders. */
    @Column(name = "average_order_value", precision = 10, scale = 2)
    private BigDecimal averageOrderValue;

    /** Number of unique users/phones that placed an order. */
    @Column(name = "unique_customers", nullable = false)
    private Integer uniqueCustomers;

    /** Number of new customers (first order ever). */
    @Column(name = "new_customers", nullable = false)
    private Integer newCustomers;

    /** Total items sold across all completed orders. */
    @Column(name = "total_items_sold", nullable = false)
    private Integer totalItemsSold;

    /** Total wallet payments collected. */
    @Column(name = "wallet_revenue", nullable = false, precision = 10, scale = 2)
    private BigDecimal walletRevenue;

    /** Total online (Razorpay) payments collected. */
    @Column(name = "online_revenue", nullable = false, precision = 10, scale = 2)
    private BigDecimal onlineRevenue;

    /** Total cash-on-delivery revenue. */
    @Column(name = "cod_revenue", nullable = false, precision = 10, scale = 2)
    private BigDecimal codRevenue;

    // ============================================================================
    // PROFITABILITY TRACKING FIELDS
    // ============================================================================

    /**
     * Sum of COALESCE(cost_price_snapshot, estimated_cost, 0) × qty
     * across all completed order_items on this date.
     */
    @Column(name = "total_estimated_cost", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal totalEstimatedCost = BigDecimal.ZERO;

    /** total_revenue - total_estimated_cost. */
    @Column(name = "total_estimated_profit", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal totalEstimatedProfit = BigDecimal.ZERO;

    /** Overall daily profit margin % = (total_estimated_profit / total_revenue) × 100. Null when revenue = 0. */
    @Column(name = "avg_profit_margin", precision = 8, scale = 4)
    private BigDecimal avgProfitMargin;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}

