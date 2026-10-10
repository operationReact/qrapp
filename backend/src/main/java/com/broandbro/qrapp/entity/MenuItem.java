package com.broandbro.qrapp.entity;

import jakarta.persistence.*;
import lombok.Data;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.broandbro.qrapp.enums.FulfillmentType;
import com.broandbro.qrapp.enums.InventoryMode;
import com.broandbro.qrapp.enums.ImageGenerationStatus;
import com.broandbro.qrapp.enums.ProductType;
import java.time.Instant;

@Entity
@Table(name = "menu_item")
@Data
public class MenuItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "product_type", nullable = false)
    private ProductType productType = ProductType.PREPARED_FOOD;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "category_id")
    private Category category;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "location_id", nullable = false)
    @JsonIgnore
    private Location location;

    /**
     * Non-owning compatibility projection for shared catalog products.  Legacy
     * menu items keep this null and retain their existing contracts.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id")
    @JsonIgnore
    private Product catalogProduct;

    // Make recommended nullable to avoid forcing a NOT NULL schema change that may time out
    private Boolean recommended;

    @Column(name = "available")
    private Boolean available = true;

    private String description;

    @Column(name = "barcode", length = 64)
    private String barcode;

    @Column(name = "mrp", precision = 19, scale = 2)
    private java.math.BigDecimal mrp;

    @Column(name = "purchase_cost", precision = 19, scale = 2)
    private java.math.BigDecimal purchaseCost;
    @Column(name = "image_url")
    private String imageUrl;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "tag_id")
    private Tag tag;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "tax_profile_id")
    private TaxProfile taxProfile;

    @Column(name = "hsn_sac", length = 20)
    private String hsnSac;

    @Column(name = "is_veg")
    private Boolean isVeg;

    /**
     * Optional relation to Vendor. Null means in-house item.
     */
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "vendor_id")
    private Vendor vendor;

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

    @Column(name = "is_deleted", nullable = false)
    private Boolean isDeleted = false;

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

    // NOTE: The legacy DB-blob image association (MenuItemImage, owning side has
    // @JoinColumn menu_item_id) was intentionally removed from this entity. It was
    // a unidirectional/mappedBy @OneToOne(LAZY) that Hibernate cannot proxy without
    // bytecode enhancement, so it was forcing an extra synchronous SELECT against
    // menu_item_image for every single menu item on every menu load (a severe N+1
    // that dominated /menu response time). Nothing in the codebase ever read this
    // field (MenuItemImageService/Controller already query MenuItemImageRepository
    // directly by menuItemId), so removing it is behavior-neutral.

    // ============================================================================
    // AI IMAGE GENERATION FIELDS
    // ============================================================================

    @Enumerated(EnumType.STRING)
    @Column(name = "image_generation_status")
    private ImageGenerationStatus imageGenerationStatus;

    @Column(name = "image_generation_error", columnDefinition = "TEXT")
    private String imageGenerationError;

    @Column(name = "ai_generated_image")
    private Boolean aiGeneratedImage = false;

    @Column(name = "image_prompt", columnDefinition = "TEXT")
    private String imagePrompt;

    // ============================================================================
    // PROFITABILITY TRACKING
    // ============================================================================

    /**
     * Optional estimated per-unit production cost (₹).
     * Used to calculate profit margin for SELF_PREPARED items where no vendor
     * cost record exists in {@code vendor_menu_item_cost_history}.
     *
     * <p>Cost resolution order at analytics snapshot time:
     * <ol>
     *   <li>{@code order_item.cost_price_snapshot}  — vendor cost captured at order time</li>
     *   <li>{@code menu_item.estimated_cost}         — this field</li>
     *   <li>0                                        — no cost known → profit = revenue</li>
     * </ol>
     */
    @Column(name = "estimated_cost", precision = 10, scale = 2)
    private java.math.BigDecimal estimatedCost;

    @Column(name = "image_prompt_hash")
    private String imagePromptHash;

    @Column(name = "image_generation_requested_at")
    private Instant imageGenerationRequestedAt;

    @Column(name = "image_generation_completed_at")
    private Instant imageGenerationCompletedAt;

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
