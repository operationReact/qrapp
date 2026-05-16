package com.broandbro.qrapp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

/**
 * Tracks inventory for LIMITED items.
 *
 * One-to-one relationship with MenuItem.
 * Only created for items with InventoryMode.LIMITED
 *
 * Uses optimistic locking (@Version) for concurrency safety.
 */
@Entity
@Table(name = "inventory", uniqueConstraints = {
    @UniqueConstraint(columnNames = "menu_item_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Inventory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * One-to-one relationship with MenuItem.
     * Only LIMITED items should have an Inventory record.
     */
    @OneToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "menu_item_id", nullable = false)
    private MenuItem menuItem;

    /**
     * Available quantity that can be ordered.
     */
    @Column(name = "available_quantity", nullable = false)
    private Long availableQuantity = 0L;

    /**
     * Reserved quantity (for future use - could be used for pre-orders, reservations).
     * Current: reserved = 0
     */
    @Column(name = "reserved_quantity", nullable = false)
    private Long reservedQuantity = 0L;

    /**
     * Threshold below which item is considered low stock.
     * Used for alerts and admin notifications.
     */
    @Column(name = "low_stock_threshold", nullable = false)
    private Long lowStockThreshold = 10L;

    /**
     * Timestamp of last inventory update.
     */
    @Column(name = "last_updated_at", nullable = false)
    private Instant lastUpdatedAt;

    /**
     * Optimistic locking version.
     * Incremented on every update to prevent concurrent modification conflicts.
     *
     * When updating:
     * - Load inventory with current version
     * - Modify quantity
     * - Save: JPA compares version in WHERE clause
     * - If version changed, throws OptimisticLockException
     * - Caller must retry
     */
    @Version
    @Column(name = "version", nullable = false)
    private Long version = 0L;

    /**
     * Timestamp when this inventory record was created.
     */
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    /**
     * Timestamp when this inventory record was last updated.
     */
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    // ============================================================================
    // LIFECYCLE METHODS
    // ============================================================================

    @PrePersist
    public void prePersist() {
        Instant now = Instant.now();
        if (createdAt == null) {
            createdAt = now;
        }
        if (updatedAt == null) {
            updatedAt = now;
        }
        if (lastUpdatedAt == null) {
            lastUpdatedAt = now;
        }
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = Instant.now();
        lastUpdatedAt = Instant.now();
    }

    // ============================================================================
    // BUSINESS LOGIC METHODS
    // ============================================================================

    /**
     * Check if inventory has sufficient quantity.
     *
     * @param requiredQuantity quantity needed
     * @return true if available quantity >= required quantity
     */
    public boolean hasSufficientQuantity(Long requiredQuantity) {
        return availableQuantity >= requiredQuantity;
    }

    /**
     * Check if inventory is low.
     *
     * @return true if available quantity is at or below low stock threshold
     */
    public boolean isLowStock() {
        return availableQuantity <= lowStockThreshold;
    }

    /**
     * Check if inventory is out of stock.
     *
     * @return true if available quantity is zero or negative
     */
    public boolean isOutOfStock() {
        return availableQuantity <= 0L;
    }

    /**
     * Get total available quantity (available - reserved).
     *
     * @return effective available quantity
     */
    public Long getEffectiveAvailableQuantity() {
        return Math.max(0L, availableQuantity - reservedQuantity);
    }
}

