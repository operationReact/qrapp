package com.broandbro.qrapp.bundle.entity;

import com.broandbro.qrapp.entity.MenuItem;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

/**
 * Junction entity: assigns a {@link MenuItem} to a {@link ComboRole}.
 *
 * <p>A single item may carry multiple roles (composite PK), but for the
 * "Complete Your Meal" feature the UI enforces one primary role per item.
 *
 * Maps to the {@code bundle_item_combo_role} table created by V50.
 */
@Entity
@Table(name = "bundle_item_combo_role",
       indexes = @Index(name = "idx_bicr_role", columnList = "combo_role_id"))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ItemComboRole {

    @EmbeddedId
    private ItemComboRoleId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("itemId")
    @JoinColumn(name = "item_id", nullable = false)
    private MenuItem menuItem;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("comboRoleId")
    @JoinColumn(name = "combo_role_id", nullable = false)
    private ComboRole comboRole;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}

