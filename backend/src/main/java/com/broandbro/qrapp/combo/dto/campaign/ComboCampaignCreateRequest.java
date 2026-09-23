package com.broandbro.qrapp.combo.dto.campaign;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.time.Instant;
import java.util.List;

public record ComboCampaignCreateRequest(

        @NotBlank(message = "Campaign name is required")
        @Size(max = 150)
        String name,

        @NotNull(message = "locationId is required")
        Long locationId,

        String description,

        Instant startsAt,
        Instant endsAt,

        @Min(value = 0)
        int displayPriority,

        @Valid
        @NotEmpty(message = "At least one discount tier is required")
        List<ComboCampaignTierRequest> tiers,

        /** category IDs eligible for this campaign (optional — empty means all items qualify) */
        List<Long> eligibleCategoryIds,

        /** specific menu-item IDs eligible (optional) */
        List<Long> eligibleMenuItemIds
) {}

