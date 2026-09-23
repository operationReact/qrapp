package com.broandbro.qrapp.combo.dto.campaign;

import com.broandbro.qrapp.enums.ComboStatus;

import java.time.Instant;
import java.util.List;

public record ComboCampaignResponse(
        Long id,
        String name,
        Long locationId,
        String description,
        ComboStatus status,
        Boolean isActive,
        Instant startsAt,
        Instant endsAt,
        Integer displayPriority,
        String createdBy,
        Instant createdAt,
        Instant updatedAt,
        List<ComboCampaignTierResponse> tiers,
        List<Long> eligibleCategoryIds,
        List<Long> eligibleMenuItemIds
) {}

