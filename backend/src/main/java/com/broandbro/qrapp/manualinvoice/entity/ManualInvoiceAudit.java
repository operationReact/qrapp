package com.broandbro.qrapp.manualinvoice.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Immutable;

import java.time.Instant;

/** Append-only audit trail for manual invoice lifecycle changes. */
@Entity
@Immutable
@Table(name = "manual_invoice_audit")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class ManualInvoiceAudit {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "manual_invoice_id", nullable = false)
    private Long manualInvoiceId;

    @Column(nullable = false, length = 40)
    private String action;

    @Column(name = "actor_user_id")
    private Long actorUserId;

    @Column(name = "actor_name", length = 160)
    private String actorName;

    @Column(name = "actor_role", length = 40)
    private String actorRole;

    @Column(name = "previous_status", length = 20)
    private String previousStatus;

    @Column(name = "new_status", length = 20)
    private String newStatus;

    @Column(length = 500)
    private String reason;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
