package com.broandbro.qrapp.signature.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "signature_product_analytics_daily",
       uniqueConstraints = @UniqueConstraint(
           name = "uq_sig_analytics_date", columnNames = {"product_id", "business_date"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SignatureProductAnalyticsDaily {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private SignatureProduct product;

    @Column(name = "business_date", nullable = false)
    private LocalDate businessDate;

    @Column(name = "total_orders", nullable = false)
    @Builder.Default
    private Integer totalOrders = 0;

    @Column(name = "total_revenue", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal totalRevenue = BigDecimal.ZERO;

    @Column(name = "combo_attachments", nullable = false)
    @Builder.Default
    private Integer comboAttachments = 0;

    @Column(name = "standalone_sales", nullable = false)
    @Builder.Default
    private Integer standaloneSales = 0;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}

