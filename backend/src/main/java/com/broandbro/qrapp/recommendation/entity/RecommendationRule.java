package com.broandbro.qrapp.recommendation.entity;

import com.broandbro.qrapp.entity.Category;
import com.broandbro.qrapp.entity.Location;
import com.broandbro.qrapp.entity.MenuItem;
import com.broandbro.qrapp.recommendation.enums.PairingRole;
import com.broandbro.qrapp.recommendation.enums.TriggerType;
import com.broandbro.qrapp.recommendation.enums.UpsellRewardType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Cart recommendation rule: when the trigger matches the cart, suggest {@link #targetItem}.
 * Maps to the {@code recommendation_rule} table created by V162.
 */
@Entity
@Table(name = "recommendation_rule")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RecommendationRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "location_id", nullable = false)
    private Location location;

    @Column(name = "name", nullable = false, length = 150)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "trigger_type", nullable = false, length = 40)
    private TriggerType triggerType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trigger_item_id")
    private MenuItem triggerItem;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trigger_category_id")
    private Category triggerCategory;

    @Column(name = "min_cart_value", precision = 10, scale = 2)
    private BigDecimal minCartValue;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "target_item_id")
    private MenuItem targetItem;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "target_category_id")
    private Category targetCategory;

    /** Set when this rule is a Complete Your Meal companion for {@link #triggerItem}. */
    @Enumerated(EnumType.STRING)
    @Column(name = "meal_role", length = 20)
    private PairingRole mealRole;

    @Enumerated(EnumType.STRING)
    @Column(name = "reward_type", nullable = false, length = 30)
    @Builder.Default
    private UpsellRewardType rewardType = UpsellRewardType.FIXED_DISCOUNT;

    @Column(name = "reward_value", nullable = false, precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal rewardValue = BigDecimal.ZERO;

    @Column(name = "priority", nullable = false)
    @Builder.Default
    private Integer priority = 0;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

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
}
