package com.broandbro.qrapp.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "partner_location")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PartnerLocation {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "partner_id", nullable = false)
    private Partner partner;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "location_id", nullable = false)
    private Location location;

    @Enumerated(EnumType.STRING)
    @Column(name = "relationship_type", nullable = false, length = 20)
    @Builder.Default
    private PartnerRelationshipType relationshipType = PartnerRelationshipType.PRIMARY;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private PartnerRelationshipStatus status = PartnerRelationshipStatus.ACTIVE;

    @Column(name = "effective_from")
    private LocalDate effectiveFrom;

    @Column(name = "effective_to")
    private LocalDate effectiveTo;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "created_by", length = 160)
    private String createdBy;

    @Column(name = "updated_by", length = 160)
    private String updatedBy;

    @PrePersist
    void prePersist() {
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
        if (relationshipType == null) relationshipType = PartnerRelationshipType.PRIMARY;
        if (status == null) status = PartnerRelationshipStatus.ACTIVE;
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = Instant.now();
    }
}
