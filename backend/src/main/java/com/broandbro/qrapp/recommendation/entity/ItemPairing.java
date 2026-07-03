package com.broandbro.qrapp.recommendation.entity;

import com.broandbro.qrapp.entity.MenuItem;
import com.broandbro.qrapp.recommendation.enums.PairingRole;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

/**
 * Admin-defined directional item pairing.
 *
 * <p>Example: "Chicken Biryani (source) → Coke (target, DRINK)"
 *
 * <p>Maps to the {@code item_pairing} table created by V55.
 *
 * <p>Pairings are ordered by {@link #priority} descending — higher value appears first.
 */
@Entity
@Table(
    name = "item_pairing",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_item_pairing",
        columnNames = {"source_item_id", "target_item_id"}
    )
)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ItemPairing {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** The item the customer has ordered / is viewing. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "source_item_id", nullable = false)
    private MenuItem sourceItem;

    /** The item being recommended as a companion. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "target_item_id", nullable = false)
    private MenuItem targetItem;

    /**
     * Role the target item plays in the pairing.
     * Stored as a VARCHAR so it is human-readable in the DB.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "pairing_role", nullable = false, length = 20)
    private PairingRole pairingRole;

    /**
     * Display priority — higher values surface first.
     * Default 0; nudge up (e.g. 10, 20) to promote specific pairings.
     */
    @Column(name = "priority", nullable = false)
    @Builder.Default
    private Integer priority = 0;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "created_by", length = 100)
    private String createdBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}

