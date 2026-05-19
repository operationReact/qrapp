package com.broandbro.qrapp.entity;

import jakarta.persistence.*;
import lombok.Data;
import com.broandbro.qrapp.enums.FulfillmentType;
import com.broandbro.qrapp.enums.InventoryMode;
import java.time.Instant;

@Entity
@Table(name = "menu_item")
@Data
public class MenuItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String name;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "category_id")
    private Category category;

    // Make recommended nullable to avoid forcing a NOT NULL schema change that may time out
    private Boolean recommended;
    private String description;
    @Column(name = "image_url")
    private String imageUrl;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "tag_id")
    private Tag tag;
    @Column(name = "is_veg")
    private Boolean isVeg;

    /**
     * Optional relation to Shop. Null means in-house item.
     */
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "shop_id")
    private Shop shop;

    /**
     * How this item is fulfilled – drives procurement and pricing logic.
     * SELF_PREPARED : prepared entirely in-house (no vendor cost).
     * OUTSOURCED    : sourced from external vendor.
     * HYBRID        : mix of both.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "fulfillment_type", nullable = false)
    private FulfillmentType fulfillmentType = FulfillmentType.SELF_PREPARED;

    // ============================================================================
    // INVENTORY MANAGEMENT FIELDS
    // ============================================================================

    @Enumerated(EnumType.STRING)
    @Column(name = "inventory_mode", nullable = false)
    private InventoryMode inventoryMode = InventoryMode.UNLIMITED;

    @Column(name = "is_hidden", nullable = false)
    private Boolean isHidden = false;

    /**
     * Optional SKU code for bulk upload identification and external system integration.
     * Must be unique when set.
     */
    @Column(name = "sku_code", unique = true)
    private String skuCode;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @OneToOne(mappedBy = "menuItem", fetch = FetchType.LAZY)
    private MenuItemImage image;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
        if (updatedAt == null) {
            updatedAt = Instant.now();
        }
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = Instant.now();
    }

    public boolean isRecommended() {
        return Boolean.TRUE.equals(this.recommended);
    }
}
