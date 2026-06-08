package com.broandbro.qrapp.bundle.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

/**
 * A named role a MenuItem can fulfil inside a Smart Bundle or Meal recommendation
 * (e.g. "Main", "Side", "Drink", "Dessert", "Addon").
 *
 * Maps to the {@code bundle_combo_role} table created by V50.
 */
@Entity
@Table(name = "bundle_combo_role",
       indexes = @Index(name = "idx_bcr_active_order", columnList = "is_active, display_order"))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ComboRole {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name", nullable = false, unique = true, length = 100)
    private String name;

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

