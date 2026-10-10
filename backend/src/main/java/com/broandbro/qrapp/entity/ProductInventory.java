package com.broandbro.qrapp.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "product_inventory")
@Getter
@Setter
@NoArgsConstructor
public class ProductInventory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "location_product_id", nullable = false, unique = true)
    private LocationProduct locationProduct;

    @Column(name = "available_quantity", nullable = false)
    private Long availableQuantity = 0L;

    @Column(name = "reserved_quantity", nullable = false)
    private Long reservedQuantity = 0L;

    @Column(name = "low_stock_threshold", nullable = false)
    private Long lowStockThreshold = 5L;

    @Version
    @Column(nullable = false)
    private Long version = 0L;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void prePersist() {
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = Instant.now();
    }
}
