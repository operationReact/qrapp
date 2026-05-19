package com.broandbro.qrapp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;

/**
 * Immutable audit log of customer-facing selling prices for a menu item.
 *
 * <p>Rules:
 * <ul>
 *   <li>Only one record per menu item may be "active" at any point in time:
 *       {@code effectiveFrom <= now AND (effectiveTo IS NULL OR effectiveTo > now)}.</li>
 *   <li>When a new price is set, the previous active record must have its
 *       {@code effectiveTo} closed before the new record is inserted.</li>
 *   <li>Records are never deleted – they form a complete price history for analytics.</li>
 * </ul>
 */
@Entity
@Table(
    name = "menu_item_selling_price_history",
    indexes = {
        @Index(name = "idx_misprice_item_from", columnList = "menu_item_id, effective_from"),
        @Index(name = "idx_misprice_active",   columnList = "menu_item_id, effective_to")
    }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MenuItemSellingPriceHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** The menu item whose selling price this record describes. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "menu_item_id", nullable = false)
    private MenuItem menuItem;

    /**
     * The customer-facing selling price valid during [effectiveFrom, effectiveTo).
     * Always stored with 2 decimal places (BigDecimal with scale = 2).
     */
    @Column(name = "selling_price", precision = 19, scale = 2, nullable = false)
    private BigDecimal sellingPrice;

    /** Inclusive start of this price's validity window. */
    @Column(name = "effective_from", nullable = false)
    private Instant effectiveFrom;

    /**
     * Exclusive end of this price's validity window.
     * NULL means the price is still active.
     */
    @Column(name = "effective_to")
    private Instant effectiveTo;

    /**
     * Human-readable reason for the price change.
     * Examples: "Launch price", "Festival discount", "Input cost increase".
     */
    @Column(name = "reason", length = 500)
    private String reason;

    /** Timestamp when this record was inserted – never changes after creation. */
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) createdAt = Instant.now();
    }
}

