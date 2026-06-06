package com.broandbro.qrapp.combo.entity;

import com.broandbro.qrapp.enums.DiscountType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * A single rung on a campaign's discount ladder.
 *
 * Example:
 *   minItems=2, discountValue=5%   → "Add 2 items → save 5%"
 *   minItems=3, discountValue=10%  → "Add 3 items → save 10%"
 */
@Entity
@Table(name = "combo_campaign_tiers")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ComboCampaignTier {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "campaign_id", nullable = false)
    private ComboCampaign campaign;

    /** Minimum number of eligible items in cart to unlock this tier. */
    @Column(name = "min_items", nullable = false)
    private Integer minItems;

    @Enumerated(EnumType.STRING)
    @Column(name = "discount_type", nullable = false, length = 20)
    @Builder.Default
    private DiscountType discountType = DiscountType.PERCENTAGE;

    @Column(name = "discount_value", nullable = false, precision = 10, scale = 2)
    private BigDecimal discountValue;

    /** Human-readable label, e.g. "5% OFF" or "Unlock 10% OFF" */
    @Column(name = "tier_label", length = 100)
    private String tierLabel;

    @Column(name = "sort_order", nullable = false)
    @Builder.Default
    private Integer sortOrder = 0;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}

