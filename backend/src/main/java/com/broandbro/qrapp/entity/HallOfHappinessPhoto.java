package com.broandbro.qrapp.entity;

import com.broandbro.qrapp.enums.HallOfHappinessConsentStatus;
import com.broandbro.qrapp.enums.HallOfHappinessPhotoStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "hall_of_happiness_photos", indexes = {
        @Index(name = "idx_hall_photo_order", columnList = "party_order_id"),
        @Index(name = "idx_hall_photo_customer", columnList = "customer_id"),
        @Index(name = "idx_hall_photo_status_consent", columnList = "status,consent_status"),
        @Index(name = "idx_hall_photo_published", columnList = "published_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HallOfHappinessPhoto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "party_order_id", nullable = false)
    private PartyOrder partyOrder;

    @Column(name = "customer_id", nullable = false)
    private Long customerId;

    @Column(name = "image_url", nullable = false, length = 1000)
    private String imageUrl;

    @Column(name = "thumbnail_url", nullable = false, length = 1000)
    private String thumbnailUrl;

    @Column(length = 240)
    private String caption;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private HallOfHappinessPhotoStatus status = HallOfHappinessPhotoStatus.PENDING;

    @Enumerated(EnumType.STRING)
    @Column(name = "consent_status", nullable = false, length = 20)
    @Builder.Default
    private HallOfHappinessConsentStatus consentStatus = HallOfHappinessConsentStatus.PENDING;

    @Column(name = "display_order", nullable = false)
    @Builder.Default
    private Integer displayOrder = 0;

    @Column(name = "created_by", length = 100)
    private String createdBy;

    @Column(name = "moderated_by", length = 100)
    private String moderatedBy;

    @Column(name = "consent_granted_at")
    private Instant consentGrantedAt;

    @Column(name = "published_at")
    private Instant publishedAt;

    @Column(name = "removed_at")
    private Instant removedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void prePersist() {
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        updatedAt = now;
        if (status == null) status = HallOfHappinessPhotoStatus.PENDING;
        if (consentStatus == null) consentStatus = HallOfHappinessConsentStatus.PENDING;
        if (displayOrder == null) displayOrder = 0;
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = Instant.now();
    }
}
