package com.broandbro.qrapp.campaign.dto;

import com.broandbro.qrapp.enums.HomeCampaignTargetType;
import com.broandbro.qrapp.enums.HomeCampaignType;
import com.broandbro.qrapp.enums.HomeCampaignAnimationPreset;
import com.broandbro.qrapp.enums.HomeCampaignAnimationIntensity;
import com.broandbro.qrapp.enums.HomeCampaignStylePreset;
import com.broandbro.qrapp.enums.HomeCampaignTypographyPreset;

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
        HomeCampaignStylePreset stylePreset,
        HomeCampaignTypographyPreset titleTypographyPreset,
        HomeCampaignTypographyPreset subtitleTypographyPreset,
        HomeCampaignTypographyPreset ctaTypographyPreset,
        HomeCampaignAnimationPreset animationPreset,
        HomeCampaignAnimationIntensity animationIntensity,
        Integer displayOrder,
        Boolean isActive,
        Instant startsAt,
        Instant endsAt,
        String createdBy,
        Instant createdAt,
        Instant updatedAt
) {}
