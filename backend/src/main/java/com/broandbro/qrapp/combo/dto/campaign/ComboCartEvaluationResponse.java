package com.broandbro.qrapp.combo.dto.campaign;

import java.math.BigDecimal;
import java.util.List;

/**
 * Cart evaluation response — returned by POST /api/combo-campaigns/evaluate.
 * The frontend uses this to show gamified progress and auto-apply discounts.
 */
public record ComboCartEvaluationResponse(

        /** Best single discount to apply (from the highest-unlocked tier across all campaigns). */
        BigDecimal bestDiscountAmount,

        /** Which campaign produced the best discount (null if none unlocked). */
        Long bestCampaignId,
        String bestCampaignName,

        /** Evaluation results per active campaign. */
        List<CampaignEligibilityResult> campaigns
) {}

