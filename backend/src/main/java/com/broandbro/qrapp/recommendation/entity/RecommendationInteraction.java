package com.broandbro.qrapp.recommendation.entity;

import com.broandbro.qrapp.entity.MenuItem;
import com.broandbro.qrapp.recommendation.enums.InteractionType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

/**
 * Captures a single customer interaction with a recommendation widget.
 *
 * <p>Every time the frontend shows a recommendation, the customer adds it
 * (ACCEPTED) or dismisses it (REJECTED), one row is inserted.
 *
 * <p>Maps to the {@code rec_interaction} table created by V56.
 *
 * <h3>Multi-Vendor Isolation</h3>
 * {@link #restaurantId} identifies the restaurant location for the source item.
 * All analytics queries MUST include a {@code WHERE restaurant_id = ?} predicate
 * so Restaurant A can never see Restaurant B's data.
 *
 * <h3>Extension Points (not yet used)</h3>
 * <ul>
 *   <li>{@link #sessionId}   – correlates events within one browsing session;
 *       enables auto-learning pairings from session-level co-acceptance signals.</li>
 *   <li>{@link #resolvedBy}  – records whether the recommendation came from
 *       PAIRING, RECOMMENDATION, or ENGINE; used for source-level scoring.</li>
 *   <li>{@link #pairingRole} – the meal role (DRINK/SIDE/DESSERT/ADDON) of the
 *       recommended item; enables role-level conversion analytics and AI scoring.</li>
 * </ul>
 */
@Entity
@Table(
    name = "rec_interaction",
    indexes = {
        @Index(name = "idx_ri_restaurant_created",
               columnList = "restaurant_id, created_at DESC"),
        @Index(name = "idx_ri_source_recommended",
               columnList = "source_item_id, recommended_item_id"),
        @Index(name = "idx_ri_interaction_type",
               columnList = "interaction_type")
    }
)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RecommendationInteraction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * The restaurant location this interaction belongs to.
     * Stored explicitly for fast, tenant-isolated queries.
     */
    @Column(name = "restaurant_id", nullable = false)
    private Long restaurantId;

    /**
     * The authenticated customer who interacted.
     * Nullable — anonymous / unauthenticated sessions are allowed.
     */
    @Column(name = "customer_id")
    private Long customerId;

    /**
     * The primary item the customer had in context when the recommendation appeared
     * (e.g. the item they just added to the cart).
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "source_item_id", nullable = false)
    private MenuItem sourceItem;

    /**
     * The item that was surfaced as a recommendation.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recommended_item_id", nullable = false)
    private MenuItem recommendedItem;

    /**
     * What the customer did: VIEWED, ACCEPTED, or REJECTED.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "interaction_type", nullable = false, length = 20)
    private InteractionType interactionType;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    // ── Extension Points ─────────────────────────────────────────────────────
    // These columns are reserved for upcoming features. Do NOT add logic for them
    // in the current sprint. They are here purely as schema extension points.

    /**
     * [FUTURE: Auto-Learning Pairings / AI Suggestions]
     * Browser / app session identifier. Allows grouping interactions from the
     * same session for session-level co-acceptance mining.
     */
    @Column(name = "session_id", length = 100)
    private String sessionId;

    /**
     * [FUTURE: Recommendation Scoring]
     * Which engine resolved this recommendation: PAIRING | RECOMMENDATION | ENGINE.
     * Enables per-source conversion analysis and score adjustment.
     */
    @Column(name = "resolved_by", length = 30)
    private String resolvedBy;

    /**
     * [FUTURE: AI Suggestions]
     * Meal role of the recommended item: DRINK | SIDE | DESSERT | ADDON.
     * Enables role-level acceptance analytics for AI model training.
     */
    @Column(name = "pairing_role", length = 20)
    private String pairingRole;
}
