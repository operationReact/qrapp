package com.broandbro.qrapp.combo.dto.campaign;

import java.math.BigDecimal;
import java.util.List;

/**
 * Represents cart evaluation result for a single active campaign.
 */
public record CampaignEligibilityResult(
        Long campaignId,
        String campaignName,

        /** Total number of eligible items in the current cart. */
        int eligibleItemCount,

        /** The currently unlocked tier (null if none). */
        ComboCampaignTierResponse currentTier,

        /** The next tier the customer can unlock (null if already at max). */
        ComboCampaignTierResponse nextTier,

        /** How many more items are needed to unlock the next tier. */
        int itemsToNextTier,

        /** Computed actual discount amount (₹) from the current tier. */
        BigDecimal actualDiscountAmount,

        /** Whether any discount is currently unlocked. */
        boolean discountUnlocked,

        /** All tiers for rendering the progress ladder. */
        List<ComboCampaignTierResponse> allTiers
) {}

