package com.broandbro.qrapp.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.Instant;

/**
 * Immutable financial snapshot of a single line item within a customer order.
 *
 * <p>All price fields are captured at order-placement time and <strong>must never
 * be changed afterwards</strong>.  Historical analytics query these columns directly
 * – recalculating values from live price tables would corrupt the audit trail.
 *
 * <ul>
 *   <li>{@code sellingPriceSnapshot} – from {@link MenuItemSellingPriceHistory}</li>
 *   <li>{@code costPriceSnapshot}    – from {@link VendorMenuItemCostHistory} (nullable for SELF_PREPARED items)</li>
 *   <li>{@code profitSnapshot}       – sellingPrice - costPrice (pre-computed)</li>
 *   <li>{@code lineTotal}            – quantity × sellingPrice</li>
 * </ul>
 */
@Entity
@Table(name = "order_item",
    indexes = {
        @Index(name = "idx_orderitem_order",   columnList = "order_id"),
        @Index(name = "idx_orderitem_item",    columnList = "item_id"),
        @Index(name = "idx_orderitem_created", columnList = "created_at")
    }
)
@Data
public class OrderItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_id", nullable = false)
    private Long orderId;

    /**
     * FK to the menu item – kept as a plain column so historical records survive
     * even if the menu item is later removed from the live catalogue.
     */
    @Column(name = "item_id", nullable = false)
    private Long itemId;

    @Column(name = "quantity", nullable = false)
    private int quantity;

    // ============================================================================
    // IMMUTABLE FINANCIAL SNAPSHOTS
    // ============================================================================

    /**
     * Customer-facing price per unit at the time of order placement.
     * Source: MenuItemSellingPriceHistory (active record at order time).
     */
    @Column(name = "selling_price_snapshot", precision = 19, scale = 2)
    private BigDecimal sellingPriceSnapshot;

    /**
     * Procurement cost per unit at the time of order placement.
     * Source: VendorMenuItemCostHistory (active record at order time).
     * NULL for SELF_PREPARED items where no vendor cost exists.
     */
    @Column(name = "cost_price_snapshot", precision = 19, scale = 2)
    private BigDecimal costPriceSnapshot;

    /**
     * Per-unit profit margin = sellingPriceSnapshot - costPriceSnapshot.
     * Pre-computed at order time; NULL when costPriceSnapshot is NULL.
     */
    @Column(name = "profit_snapshot", precision = 19, scale = 2)
    private BigDecimal profitSnapshot;

    /**
     * quantity × sellingPriceSnapshot.
     * Pre-computed for analytics query performance.
     */
    @Column(name = "line_total", precision = 19, scale = 2)
    private BigDecimal lineTotal;

    /** Timestamp when this snapshot was recorded. */
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) createdAt = Instant.now();
        // Compute derived fields if not explicitly set
        if (lineTotal == null && sellingPriceSnapshot != null) {
            lineTotal = sellingPriceSnapshot.multiply(BigDecimal.valueOf(quantity));
        }
        if (profitSnapshot == null && sellingPriceSnapshot != null && costPriceSnapshot != null) {
            profitSnapshot = sellingPriceSnapshot.subtract(costPriceSnapshot);
        }
    }
}