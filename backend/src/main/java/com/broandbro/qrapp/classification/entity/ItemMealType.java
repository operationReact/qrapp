package com.broandbro.qrapp.classification.entity;

import com.broandbro.qrapp.entity.MenuItem;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

/**
 * Junction entity: assigns a {@link MenuItem} to one or more {@link MealType}(s).
 *
 * Maps to {@code item_meal_type} table created by V54.
 */
@Entity
@Table(name = "item_meal_type",
       indexes = @Index(name = "idx_imt_meal_type", columnList = "meal_type_id"))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ItemMealType {

    @EmbeddedId
    private ItemMealTypeId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("itemId")
    @JoinColumn(name = "item_id", nullable = false)
    private MenuItem menuItem;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("mealTypeId")
    @JoinColumn(name = "meal_type_id", nullable = false)
    private MealType mealType;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}

