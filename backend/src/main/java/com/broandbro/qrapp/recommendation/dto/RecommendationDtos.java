package com.broandbro.qrapp.recommendation.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

// ── Request DTOs ──────────────────────────────────────────────────────────────

public class RecommendationDtos {

    // ── L2 Auto Suggestions ───────────────────────────────────────────────────

    @Data
    @Builder
    public static class AutoSuggestionResponse {
        private Long id;
        private Long itemAId;
        private String itemAName;
        private Long itemBId;
        private String itemBName;
        private BigDecimal confidence;
        private Integer coCount;
        private String status;
        private String reviewedBy;
        private Instant reviewedAt;
        private Instant createdAt;
    }

    @Data
    public static class ReviewSuggestionRequest {
        private String action;  // "ACCEPT" or "REJECT"
    }

    @Data
    public static class BulkReviewRequest {
        private List<Long> ids;
        private String action;  // "ACCEPT" or "REJECT"
    }

    // ── Cart Recommendation Engine ────────────────────────────────────────────

    @Data
    public static class CartRecommendationRequest {
        private List<Long> itemIds;
        private List<Long> categoryIds;
        private Long locationId;
        private BigDecimal cartTotal = BigDecimal.ZERO;
        private int maxResults = 8;
    }

    @Data
    @Builder
    public static class RecommendationSuggestion {
        private Long itemId;
        private String itemName;
        private String imageUrl;
        private BigDecimal price;
        private String source;            // MANUAL | AUTO | UPSELL | BEST_SELLER
        private BigDecimal discountAmount; // non-null for UPSELL source
        private String discountLabel;     // e.g. "₹30 off", "50% off"
        private Long ruleId;              // cart rule that produced this suggestion, null otherwise
    }

    @Data
    @Builder
    public static class CartRecommendationResponse {
        private List<RecommendationSuggestion> suggestions;
        private String resolvedBy;   // which priority level resolved it
    }
}
