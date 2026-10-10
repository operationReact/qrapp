package com.broandbro.qrapp.partnerfinance.entity;

import com.broandbro.qrapp.partnerfinance.enums.FinanceEntityType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Immutable;

import java.time.Instant;

/** Append-only audit trail for finance mutations: actor, action, previous and new values, reason. */
@Entity
@Immutable
@Table(name = "partner_finance_audit")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class PartnerFinanceAudit {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "partner_id", nullable = false)
    private Long partnerId;

    @Enumerated(EnumType.STRING)
    @Column(name = "entity_type", nullable = false, length = 30)
    private FinanceEntityType entityType;

    @Column(name = "entity_id", nullable = false)
    private Long entityId;

    @Column(nullable = false, length = 40)
    private String action;

    @Column(name = "actor_user_id")
    private Long actorUserId;

    @Column(name = "actor_name", length = 160)
    private String actorName;

    @Column(name = "actor_role", length = 40)
    private String actorRole;

    @Column(name = "previous_value", columnDefinition = "TEXT")
    private String previousValue;

    @Column(name = "new_value", columnDefinition = "TEXT")
    private String newValue;

    @Column(length = 500)
    private String reason;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = Instant.now();
    }
}