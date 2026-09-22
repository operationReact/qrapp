package com.broandbro.qrapp.signature.entity;

import com.broandbro.qrapp.entity.Location;
import com.broandbro.qrapp.enums.SignatureProductCategory;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "signature_products")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SignatureProduct {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Location that owns this signature product. Every product is scoped to exactly
     * one location so the admin catalogue can be filtered per location while
     * SUPER_ADMIN retains the cross-location view. Application code always sets it
     * for newly created products.
     */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "location_id", nullable = false)
    private Location location;

    @Column(name = "product_name", nullable = false, length = 150)
    private String productName;

    @Column(name = "short_name", nullable = false, length = 60)
    private String shortName;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private SignatureProductCategory category;

    @Column(name = "image_url", columnDefinition = "TEXT")
    private String imageUrl;

    @Column(name = "selling_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal sellingPrice;

    @Column(name = "procurement_price", precision = 10, scale = 2)
    private BigDecimal procurementPrice;

    @Column(name = "stock_quantity", nullable = false)
    @Builder.Default
    private Integer stockQuantity = 0;

    @Column(name = "minimum_stock_threshold", nullable = false)
    @Builder.Default
    private Integer minimumStockThreshold = 5;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "is_featured", nullable = false)
    @Builder.Default
    private Boolean isFeatured = false;

    @Column(name = "is_combo_attachable", nullable = false)
    @Builder.Default
    private Boolean isComboAttachable = false;

    @Column(name = "display_priority", nullable = false)
    @Builder.Default
    private Integer displayPriority = 0;

    @Column(name = "vendor_name", length = 150)
    private String vendorName;

    @Column(name = "vendor_contact", length = 50)
    private String vendorContact;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    @Version
    @Column(nullable = false)
    private Long version;

    // ── Derived helpers ────────────────────────────────────────────────────────

    @Transient
    public boolean isDeleted() { return deletedAt != null; }

    @Transient
    public boolean isLowStock() { return stockQuantity <= minimumStockThreshold; }

    @Transient
    public boolean isOutOfStock() { return stockQuantity <= 0; }
}

