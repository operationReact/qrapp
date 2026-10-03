package com.broandbro.qrapp.foodcourt.entity;

import com.broandbro.qrapp.foodcourt.enums.AuditAction;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.time.Instant;
import java.util.UUID;

/**
 * An append-only audit record of a significant food court action. Captures the
 * opaque actor id, the targeted entity and a human-readable summary so the
 * full history of financial and configuration changes is preserved.
 */
@Entity
@Table(name = "fc_audit_events")
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
public class FoodCourtAuditEvent extends FoodCourtBaseEntity {

    @Column(name = "food_court_id", nullable = false)
    private UUID foodCourtId;

    @Enumerated(EnumType.STRING)
    @Column(name = "action", nullable = false, length = 30)
    private AuditAction action;

    @Column(name = "entity_type", nullable = false, length = 60)
    private String entityType;

    @Column(name = "entity_id")
    private UUID entityId;

    /** Opaque user id of the actor. */
    @Column(name = "actor_user_id", length = 100)
    private String actorUserId;

    @Column(name = "summary", length = 500)
    private String summary;

    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt;
}
