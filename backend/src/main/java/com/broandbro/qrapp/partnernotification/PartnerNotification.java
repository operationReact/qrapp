package com.broandbro.qrapp.partnernotification;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/** In-app notification for one partner user. Only read_at ever changes after creation. */
@Entity
@Table(name = "partner_notification",
        uniqueConstraints = @UniqueConstraint(name = "uq_partner_notification_event",
                columnNames = {"partner_id", "partner_user_id", "event_key"}))
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class PartnerNotification {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "partner_id", nullable = false, updatable = false)
    private Long partnerId;

    @Column(name = "partner_user_id", updatable = false)
    private Long partnerUserId;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, length = 40, updatable = false)
    private PartnerNotificationType eventType;

    @Column(nullable = false, length = 160, updatable = false)
    private String title;

    @Column(nullable = false, length = 500, updatable = false)
    private String message;

    @Column(name = "target_path", length = 255, updatable = false)
    private String targetPath;

    @Column(name = "entity_id", updatable = false)
    private Long entityId;

    @Column(name = "event_key", nullable = false, length = 120, updatable = false)
    private String eventKey;

    @Column(name = "read_at")
    private Instant readAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
