package com.broandbro.qrapp.analytics.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.JdbcTypeCode;

import java.math.BigDecimal;
import java.sql.Types;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Materialised hourly order distribution snapshot.
 *
 * <p>One row per (date, hour) pair. Used to render peak-hour heatmaps
 * and optimise staffing. Populated every hour by {@code HourlyOrderTrendScheduler}.</p>
 *
 * <p>Table: {@code analytics_hourly_orders}</p>
 */
@Entity
@Table(
    name = "analytics_hourly_orders",
    uniqueConstraints = {
        @UniqueConstraint(
            name = "uq_analytics_hourly_orders_date_hour",
            columnNames = {"order_date", "hour_of_day"}
        )
    },
    indexes = {
        @Index(name = "idx_aho_order_date",   columnList = "order_date DESC"),
        @Index(name = "idx_aho_hour_of_day",  columnList = "hour_of_day"),
        @Index(name = "idx_aho_date_hour",    columnList = "order_date, hour_of_day"),
        @Index(name = "idx_aho_order_count",  columnList = "order_count DESC")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HourlyOrderAnalytics {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** The calendar date for this hourly bucket. */
    @Column(name = "order_date", nullable = false)
    private LocalDate orderDate;

    /**
     * Hour of day in 24h format (0–23).
     * 0 = 00:00–00:59, 13 = 13:00–13:59, etc.
     */
    @Column(name = "hour_of_day", nullable = false)
    @JdbcTypeCode(Types.SMALLINT)
    private Integer hourOfDay;

    /** Day of week: 1 = Monday … 7 = Sunday (ISO-8601). */
    @Column(name = "day_of_week", nullable = false)
    @JdbcTypeCode(Types.SMALLINT)
    private Integer dayOfWeek;

    /** Total orders placed in this hour bucket. */
    @Column(name = "order_count", nullable = false)
    private Integer orderCount;

    /** Completed orders within this hour bucket. */
    @Column(name = "completed_count", nullable = false)
    private Integer completedCount;

    /** Total revenue from completed orders in this hour. */
    @Column(name = "hour_revenue", nullable = false, precision = 10, scale = 2)
    private BigDecimal hourRevenue;

    /** Average fulfilment time (minutes) for completed orders in this bucket. */
    @Column(name = "avg_fulfilment_minutes", precision = 6, scale = 2)
    private BigDecimal avgFulfilmentMinutes;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}

