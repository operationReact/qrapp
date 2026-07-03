package com.broandbro.qrapp.classification.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

/**
 * Defines the food style or cuisine of a menu item.
 * Examples: SouthIndian, NorthIndian, Chinese, Italian, FastFood, Bakery, Beverage, Desserts.
 *
 * Maps to {@code cuisine_type} table created by V54.
 *
 * <p>Part of the 3-Dimension Menu Classification System:
 * <ul>
 *   <li>Dimension 1 – ComboRole ({@code bundle_combo_role})</li>
 *   <li>Dimension 2 – MealType ({@code meal_type})</li>
 *   <li><b>Dimension 3 – CuisineType ({@code cuisine_type})</b></li>
 * </ul>
 */
@Entity
@Table(name = "cuisine_type",
       indexes = @Index(name = "idx_cuisine_type_active_order", columnList = "is_active, display_order"))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CuisineType {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}

