package com.broandbro.qrapp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;

/**
 * Immutable audit log of procurement costs for a menu item supplied by a specific vendor.
 *
 * <p>Rules:
 * <ul>
 *   <li>Multiple vendors can supply the same item – each vendor has its own cost history.</li>
 *   <li>Only one record per (vendor, menuItem) pair may be active at any point in time.</li>
 *   <li>When cost changes, close the previous record's {@code effectiveTo} and insert a new one.</li>
 *   <li>Records are never deleted – history is sacred for procurement analytics.</li>
 * </ul>
 */
@Entity
@Table(
    name = "vendor_menu_item_cost_history",
    indexes = {
        @Index(name = "idx_vendorcost_vendor_item_from", columnList = "vendor_id, menu_item_id, effective_from"),
        @Index(name = "idx_vendorcost_active",         columnList = "vendor_id, menu_item_id, effective_to"),
        @Index(name = "idx_vendorcost_item",           columnList = "menu_item_id")
    }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VendorMenuItemCostHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * The vendor / external vendor supplying the item.
     * For self-prepared items this may be null (or point to an internal "kitchen" entity).
     */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "vendor_id", nullable = false)
    private Vendor vendor;

    /** The menu item whose procurement cost this record describes. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "menu_item_id", nullable = false)
    private MenuItem menuItem;

    /**
     * The per-unit cost at which the vendor supplies the item.
     * Used for profitability calculations: profit = sellingPrice - costPrice.
     */
    @Column(name = "cost_price", precision = 19, scale = 2, nullable = false)
    private BigDecimal costPrice;

    /** Inclusive start of this cost's validity window. */
    @Column(name = "effective_from", nullable = false)
    private Instant effectiveFrom;

    /**
     * Exclusive end of this cost's validity window.
     * NULL means this cost is still active.
     */
    @Column(name = "effective_to")
    private Instant effectiveTo;

    /** Timestamp when this record was inserted – never changes after creation. */
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
