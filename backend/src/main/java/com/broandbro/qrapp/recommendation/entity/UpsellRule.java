package com.broandbro.qrapp.recommendation.entity;

import com.broandbro.qrapp.entity.Category;
import com.broandbro.qrapp.entity.MenuItem;
import com.broandbro.qrapp.recommendation.enums.TriggerType;
import com.broandbro.qrapp.recommendation.enums.UpsellRewardType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * L4 – Upsell rule: when a trigger condition is met, offer target items.
 *
 * <p>Trigger examples:
 * <ul>
 *   <li>ITEM_IN_CART       → trigger_item_id set</li>
 *   <li>CATEGORY_IN_CART   → trigger_cat_id set</li>
 *   <li>CART_VALUE_EXCEEDS → min_cart_value set</li>
 * </ul>
 */
@Entity
@Table(name = "rec_upsell_rule")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class UpsellRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name", nullable = false, length = 150)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "trigger_type", nullable = false, length = 40)
    private TriggerType triggerType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trigger_item_id")
    private MenuItem triggerItem;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trigger_cat_id")
    private Category triggerCategory;

    @Column(name = "min_cart_value", precision = 10, scale = 2)
    private BigDecimal minCartValue;

    @Enumerated(EnumType.STRING)
    @Column(name = "reward_type", nullable = false, length = 30)
    @Builder.Default
    private UpsellRewardType rewardType = UpsellRewardType.FIXED_DISCOUNT;

    @Column(name = "reward_value", nullable = false, precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal rewardValue = BigDecimal.ZERO;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "display_order", nullable = false)
    @Builder.Default
    private Integer displayOrder = 0;

    @Column(name = "created_by", length = 100)
    private String createdBy;

    @Column(name = "updated_by", length = 100)
    private String updatedBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @OneToMany(mappedBy = "rule", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<UpsellRuleTarget> targets = new ArrayList<>();
}

