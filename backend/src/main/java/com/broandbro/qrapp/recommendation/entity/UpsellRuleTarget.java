package com.broandbro.qrapp.recommendation.entity;

import com.broandbro.qrapp.entity.MenuItem;
import jakarta.persistence.*;
import lombok.*;

/**
 * L4 – Target items offered when an {@link UpsellRule} triggers.
 */
@Entity
@Table(name = "rec_upsell_rule_target")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class UpsellRuleTarget {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rule_id", nullable = false)
    private UpsellRule rule;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "item_id", nullable = false)
    private MenuItem item;

    @Column(name = "sort_order", nullable = false)
    @Builder.Default
    private Integer sortOrder = 0;
}

