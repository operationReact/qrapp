package com.broandbro.qrapp.campaign.dto;

import com.broandbro.qrapp.enums.HomeCampaignTargetType;
import com.broandbro.qrapp.enums.HomeCampaignType;

import java.time.Instant;

public record HomeCampaignResponse(
        Long id,
        HomeCampaignType type,
        Long locationId,
        String locationName,
        String badge,
        String title,
        String subtitle,
        String ctaLabel,
        String imageUrl,
        String mobileImageUrl,
        HomeCampaignTargetType targetType,
        String targetId,
        String visualVariant,
        Integer displayOrder,
        Boolean isActive,
        Instant startsAt,
        Instant endsAt,
        String createdBy,
        Instant createdAt,
        Instant updatedAt
) {}
