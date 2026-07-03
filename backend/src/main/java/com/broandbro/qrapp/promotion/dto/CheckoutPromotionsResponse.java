package com.broandbro.qrapp.promotion.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class CheckoutPromotionsResponse {
    private List<EligiblePromotionDto> eligiblePromotions;
    private List<IneligiblePromotionDto> ineligiblePromotions;
    private EligiblePromotionDto recommendedPromotion;
    private int totalEligibleCount;
}

