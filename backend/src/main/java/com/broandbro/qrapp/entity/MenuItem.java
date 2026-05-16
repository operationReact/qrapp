package com.broandbro.qrapp.entity;

import jakarta.persistence.*;
import lombok.Data;
import com.broandbro.qrapp.enums.InventoryMode;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "menu_item")
@Data
public class MenuItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String name;
    @Column(name = "base_price", precision = 19, scale = 2, nullable = false)
    private BigDecimal basePrice = BigDecimal.ZERO;

    /**
     * Margin applied by Bro & Bro. For in-house items margin = 0.
     */
    @Column(name = "margin", precision = 19, scale = 2, nullable = false)
    private BigDecimal margin = BigDecimal.ZERO;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "category_id")
    private Category category;

    // Make recommended nullable to avoid forcing a NOT NULL schema change that may time out
    // Use Boolean so adding the column is a fast nullable add; provide a convenience
    // isRecommended() to preserve existing code that calls the boolean-style getter.
    private Boolean recommended;
    private String description;
    @Column(name = "image_url")
    private String imageUrl;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "tag_id")
    private Tag tag;
    @Column(name = "is_veg")
    private Boolean isVeg;

    @Transient
    private BigDecimal price;

    /**
     * Optional relation to Shop. Null means in-house item.
     */
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "shop_id")
    private Shop shop;

    // ============================================================================
    // INVENTORY MANAGEMENT FIELDS
    // ============================================================================

    /**
     * Determines how inventory is managed for this item.
     * UNLIMITED: no inventory tracking required
     * LIMITED: inventory quantity must be tracked and enforced
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "inventory_mode", nullable = false)
    private InventoryMode inventoryMode = InventoryMode.UNLIMITED;

    /**
     * Whether this item is hidden from the menu.
     * true = item is hidden and not visible to customers
     * false = item is visible in menu
     *
     * Also used for manual admin pauses (kitchen issue, ingredient shortage).
     * Stock availability is derived, not stored:
     *   UNLIMITED → always orderable (when not hidden)
     *   LIMITED   → orderable when inventory.availableQuantity > 0 (and not hidden)
     */
    @Column(name = "is_hidden", nullable = false)
    private Boolean isHidden = false;


    /**
     * Timestamp when item was created.
     */
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    /**
     * Timestamp when item was last updated.
     */
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    // ============================================================================
    // LIFECYCLE METHODS
    // ============================================================================

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

    /**
     * Compute selling price dynamically (do not store in DB)
     */
    public BigDecimal getSellingPrice() {
        BigDecimal bp = basePrice == null ? BigDecimal.ZERO : basePrice;
        BigDecimal m = margin == null ? BigDecimal.ZERO : margin;
        price = bp.add(m);
        return price;
    }

}
