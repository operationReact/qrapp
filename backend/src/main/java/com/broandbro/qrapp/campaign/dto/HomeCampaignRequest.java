package com.broandbro.qrapp.campaign.dto;

import com.broandbro.qrapp.enums.HomeCampaignTargetType;
import com.broandbro.qrapp.enums.HomeCampaignType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;

/**
 * Create/update payload for an admin Home campaign. {@code locationId == null}
 * means GLOBAL (visible at every location) — the service enforces that only
 * callers with cross-location access may set it.
 */
public record HomeCampaignRequest(

        @NotNull(message = "type is required")
        HomeCampaignType type,

        Long locationId,

        @Size(max = 100)
        String badge,

        @Size(max = 150)
        String title,

        @Size(max = 255)
        String subtitle,

        @Size(max = 50)
        String ctaLabel,

        String imageUrl,
        String mobileImageUrl,

        HomeCampaignTargetType targetType,

        @Size(max = 150)
        String targetId,

        @Size(max = 30)
        String visualVariant,

        Integer displayOrder,

        Boolean isActive,

        Instant startsAt,
        Instant endsAt
) {}
