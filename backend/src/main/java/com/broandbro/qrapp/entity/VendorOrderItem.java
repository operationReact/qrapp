package com.broandbro.qrapp.entity;
import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.Instant;

/**
 * A line item within a procurement (vendor) order.
 *
 * <p>Financial snapshots use PROCUREMENT (cost) pricing only.
 * Selling price is irrelevant here – this represents what was ordered from
 * the vendor and at what cost at the time of ordering.
 */
@Entity
@Table(name = "vendor_order_item",
    indexes = {
        @Index(name = "idx_vendororderitem_order", columnList = "vendor_order_id"),
        @Index(name = "idx_vendororderitem_item",  columnList = "menu_item_id")
    }
)
@Data
public class VendorOrderItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "vendor_order_id")
    private VendorOrder vendorOrder;

    /** FK to the ordered menu item – kept as a relation for query joins. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "menu_item_id", nullable = false)
    private MenuItem menuItem;

    @Column(nullable = false)
    private Integer quantity;

    /**
     * Per-unit procurement cost at the time of order placement.
     * Immutable after creation – snapshot of VendorMenuItemCostHistory.costPrice.
     */
    @Column(name = "cost_price_snapshot", precision = 19, scale = 2, nullable = false)
    private BigDecimal costPriceSnapshot;

    /**
     * quantity × costPriceSnapshot – pre-computed for query performance.
     * Never recalculated after order placement.
     */
    @Column(name = "line_total", precision = 19, scale = 2, nullable = false)
    private BigDecimal lineTotal;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @PrePersist
    public void prePersist() {
        this.createdAt = Instant.now();
        if (this.lineTotal == null && this.costPriceSnapshot != null && this.quantity != null) {
            this.lineTotal = this.costPriceSnapshot.multiply(BigDecimal.valueOf(this.quantity));
        }
    }
}
