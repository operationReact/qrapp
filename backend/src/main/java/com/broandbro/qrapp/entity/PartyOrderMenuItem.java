package com.broandbro.qrapp.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * A single free-text menu item tag belonging to a {@link PartyOrder}.
 * Items are custom strings — they do NOT reference the restaurant's menu catalogue.
 * Admin can set quotedPrice and estimatedCost; profit is auto-derived.
 */
@Entity
@Table(name = "party_order_menu_items",
    indexes = @Index(name = "idx_pomi_party_order_id", columnList = "party_order_id"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PartyOrderMenuItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "party_order_id", nullable = false)
    private PartyOrder partyOrder;

    @Column(name = "item_name", nullable = false, length = 255)
    private String itemName;

    /** Admin-set notes for this menu item. */
    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    /** Price quoted to customer for this item. */
    @Column(name = "quoted_price", precision = 12, scale = 2)
    private BigDecimal quotedPrice;

    /** Admin's estimated cost/expense for this item (internal). */
    @Column(name = "estimated_cost", precision = 12, scale = 2)
    private BigDecimal estimatedCost;

    /** Auto-derived: quotedPrice - estimatedCost. */
    @Column(name = "estimated_profit", precision = 12, scale = 2)
    private BigDecimal estimatedProfit;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
