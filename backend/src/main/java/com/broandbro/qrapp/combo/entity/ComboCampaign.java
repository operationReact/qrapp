package com.broandbro.qrapp.combo.entity;

import com.broandbro.qrapp.entity.Location;
import com.broandbro.qrapp.enums.ComboStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Top-level BYOC campaign entity.
 * Links to ComboCampaignTier (discount ladder) and ComboCampaignEligibility (allow-list).
 */
@Entity
@Table(name = "combo_campaigns")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ComboCampaign {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Location that owns this campaign. Every campaign is scoped to exactly one
     * location so the admin surface can be filtered per location while SUPER_ADMIN
     * retains the cross-location view. Derived from the campaign's eligible
     * menu-item / category location; application code sets it on create.
     */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "location_id", nullable = false)
    private Location location;

    @Column(name = "name", nullable = false, length = 150)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private ComboStatus status = ComboStatus.ACTIVE;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "starts_at")
    private Instant startsAt;

    @Column(name = "ends_at")
    private Instant endsAt;

    @Column(name = "display_priority", nullable = false)
    @Builder.Default
    private Integer displayPriority = 0;

    @Column(name = "created_by", length = 100)
    private String createdBy;

    @Column(name = "updated_by", length = 100)
    private String updatedBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    @Version
    @Column(name = "version", nullable = false)
    @Builder.Default
    private Long version = 0L;

    @OneToMany(mappedBy = "campaign", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<ComboCampaignTier> tiers = new ArrayList<>();

    @OneToMany(mappedBy = "campaign", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<ComboCampaignEligibility> eligibilityRules = new ArrayList<>();
}

