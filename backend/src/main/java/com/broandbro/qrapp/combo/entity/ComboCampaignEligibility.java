package com.broandbro.qrapp.combo.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

/**
 * Allow-list entry: either a category or a specific menu item qualifies for the campaign.
 * Exactly one of categoryId / menuItemId must be set (enforced by DB constraint).
 */
@Entity
@Table(name = "combo_campaign_eligibility")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ComboCampaignEligibility {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "campaign_id", nullable = false)
    private ComboCampaign campaign;

    /** Eligible by category — all items in this category qualify. */
    @Column(name = "category_id")
    private Long categoryId;

    /** Eligible by specific menu item. */
    @Column(name = "menu_item_id")
    private Long menuItemId;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}

