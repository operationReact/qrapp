package com.broandbro.qrapp.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "product_master",
        uniqueConstraints = @UniqueConstraint(name = "uq_product_master_sku_variant",
                columnNames = {"sku", "variant_identity"}))
@Getter
@Setter
@NoArgsConstructor
public class Product {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(length = 80)
    private String sku;

    @Column(name = "variant_identity", nullable = false, length = 120)
    private String variantIdentity = "DEFAULT";

    @Column(nullable = false, length = 200)
    private String name;

    @Column(length = 120)
    private String brand;

    @Column(columnDefinition = "TEXT")
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tax_profile_id")
    private TaxProfile taxProfile;

    @Column(name = "hsn_sac", length = 20)
    private String hsnSac;

    /** TRUE = veg (default), FALSE = non veg. */
    @Column(name = "is_veg", nullable = false)
    private Boolean isVeg;

    @Column(name = "image_url", columnDefinition = "TEXT")
    private String imageUrl;

    @Column(name = "image_key", columnDefinition = "TEXT")
    private String imageKey;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "image_asset_id")
    private ProductImageAsset imageAsset;

    @Column(name = "is_active", nullable = false)
    private Boolean active = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void prePersist() {
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
        if (variantIdentity == null || variantIdentity.isBlank()) variantIdentity = "DEFAULT";
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = Instant.now();
    }
}
