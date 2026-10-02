package com.broandbro.qrapp.campaign.entity;

import com.broandbro.qrapp.entity.Location;
import com.broandbro.qrapp.enums.HomeCampaignTargetType;
import com.broandbro.qrapp.enums.HomeCampaignType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

/**
 * Admin-managed Home page promotional content (hero billboard, discovery
 * tiles, promotion cards). {@link #location} is {@code null} for GLOBAL
 * campaigns (visible at every location); a non-null location scopes the
 * campaign to exactly that location, mirroring {@code ComboCampaign}.
 */
@Entity
@Table(name = "home_campaigns")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class HomeCampaign {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "location_id")
    private Location location;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 20)
    private HomeCampaignType type;

    @Column(name = "badge", length = 100)
    private String badge;

    @Column(name = "title", nullable = false, length = 150)
    private String title;

    @Column(name = "subtitle", length = 255)
    private String subtitle;

    @Column(name = "cta_label", length = 50)
    private String ctaLabel;

    @Column(name = "image_url", columnDefinition = "TEXT")
    private String imageUrl;

    @Column(name = "image_key", columnDefinition = "TEXT")
    private String imageKey;

    @Column(name = "mobile_image_url", columnDefinition = "TEXT")
    private String mobileImageUrl;

    @Column(name = "mobile_image_key", columnDefinition = "TEXT")
    private String mobileImageKey;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_type", nullable = false, length = 20)
    @Builder.Default
    private HomeCampaignTargetType targetType = HomeCampaignTargetType.NONE;

    @Column(name = "target_id", length = 150)
    private String targetId;

    @Column(name = "visual_variant", length = 30)
    private String visualVariant;

    @Column(name = "display_order", nullable = false)
    @Builder.Default
    private Integer displayOrder = 0;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "starts_at")
    private Instant startsAt;

    @Column(name = "ends_at")
    private Instant endsAt;

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
}
