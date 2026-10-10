package com.broandbro.qrapp.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "product_inventory_movement")
@Getter
@Setter
@NoArgsConstructor
public class ProductInventoryMovement {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "location_product_id", nullable = false)
    private LocationProduct locationProduct;

    @Column(name = "movement_type", nullable = false, length = 30)
    private String movementType;

    @Column(name = "quantity_delta", nullable = false)
    private Long quantityDelta;

    @Column(name = "quantity_before", nullable = false)
    private Long quantityBefore;

    @Column(name = "quantity_after", nullable = false)
    private Long quantityAfter;

    @Column(length = 512)
    private String reason;

    @Column(name = "reference_id", length = 120)
    private String referenceId;

    @Column(name = "changed_by")
    private Long changedBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
