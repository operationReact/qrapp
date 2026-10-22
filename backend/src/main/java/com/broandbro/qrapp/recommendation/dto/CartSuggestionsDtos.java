package com.broandbro.qrapp.recommendation.dto;

import com.broandbro.qrapp.recommendation.dto.CartBundleDtos.CartBundleResponse;
import com.broandbro.qrapp.recommendation.dto.MealRecommendationDtos.MealRecommendationResponse;
import com.broandbro.qrapp.recommendation.dto.RecommendationDtos.RecommendationSuggestion;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

/** Request and response for POST /api/cart/suggestions. */
public class CartSuggestionsDtos {

    @Data
    public static class CartSuggestionsRequest {
        private List<Long> cartItemIds;
        private List<Long> categoryIds;
        private BigDecimal cartTotal;
        private int maxResults;
        private Long locationId;
    }

    /** Only one slot is populated, in priority order: meal, then bundle, then suggestions. */
    @Data
    @Builder
    public static class CartSuggestionsResponse {
        private MealRecommendationResponse meal;
        private CartBundleResponse bundle;
        private List<RecommendationSuggestion> suggestions;
    }
}
