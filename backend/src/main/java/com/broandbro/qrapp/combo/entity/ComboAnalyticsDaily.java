package com.broandbro.qrapp.combo.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "combo_analytics_daily",
       uniqueConstraints = @UniqueConstraint(
           name = "uq_combo_analytics_date_location",
           columnNames = {"combo_id", "business_date", "location_id"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ComboAnalyticsDaily {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "combo_id", nullable = false)
    private Combo combo;

    /** Owning location (the combo's menu-item location). Snapshots are per (combo, date, location). */
    @Column(name = "location_id", nullable = false)
    private Long locationId;

    @Column(name = "business_date", nullable = false)
    private LocalDate businessDate;

    @Column(name = "total_orders", nullable = false)
    @Builder.Default
    private Integer totalOrders = 0;

    @Column(name = "total_revenue", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal totalRevenue = BigDecimal.ZERO;

    @Column(name = "total_savings_given", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal totalSavingsGiven = BigDecimal.ZERO;

    @Column(name = "avg_order_value", precision = 10, scale = 2)
    private BigDecimal avgOrderValue;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}

