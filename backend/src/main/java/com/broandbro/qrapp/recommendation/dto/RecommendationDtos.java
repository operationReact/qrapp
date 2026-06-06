package com.broandbro.qrapp.recommendation.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

// ── Request DTOs ──────────────────────────────────────────────────────────────

public class RecommendationDtos {

    // ── L1 Manual Recommendations ─────────────────────────────────────────────

    @Data
    public static class AddItemRecommendationRequest {
        private Long sourceItemId;
        private Long targetItemId;
        private Integer displayOrder = 0;
    }

    @Data
    @Builder
    public static class ItemRecommendationResponse {
        private Long id;
        private Long sourceItemId;
        private String sourceItemName;
        private Long targetItemId;
        private String targetItemName;
        private String targetItemImageUrl;
        private BigDecimal targetItemPrice;
        private Integer displayOrder;
        private Boolean isActive;
        private Instant createdAt;
    }

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

    // ── L4 Upsell Rules ───────────────────────────────────────────────────────

    @Data
    public static class UpsellRuleRequest {
        private String name;
        private String triggerType;  // ITEM_IN_CART | CATEGORY_IN_CART | CART_VALUE_EXCEEDS
        private Long triggerItemId;
        private Long triggerCategoryId;
        private BigDecimal minCartValue;
        private String rewardType;   // FIXED_DISCOUNT | PERCENT_DISCOUNT
        private BigDecimal rewardValue;
        private Boolean isActive = true;
        private Integer displayOrder = 0;
        private List<Long> targetItemIds;
    }

    @Data
    @Builder
    public static class UpsellRuleResponse {
        private Long id;
        private String name;
        private String triggerType;
        private Long triggerItemId;
        private String triggerItemName;
        private Long triggerCategoryId;
        private String triggerCategoryName;
        private BigDecimal minCartValue;
        private String rewardType;
        private BigDecimal rewardValue;
        private Boolean isActive;
        private Integer displayOrder;
        private List<UpsellTargetItem> targets;
        private Instant createdAt;

        @Data
        @Builder
        public static class UpsellTargetItem {
            private Long itemId;
            private String itemName;
            private String imageUrl;
            private BigDecimal price;
            private Integer sortOrder;
        }
    }

    // ── L5 Category Pairings ─────────────────────────────────────────────────

    @Data
    public static class CategoryPairingRequest {
        private Long sourceCategoryId;
        private Long targetCategoryId;
        private Integer displayOrder = 0;
    }

    @Data
    @Builder
    public static class CategoryPairingResponse {
        private Long id;
        private Long sourceCategoryId;
        private String sourceCategoryName;
        private Long targetCategoryId;
        private String targetCategoryName;
        private Integer displayOrder;
        private Boolean isActive;
        private Instant createdAt;
    }

    // ── Cart Recommendation Engine ────────────────────────────────────────────

    @Data
    public static class CartRecommendationRequest {
        private List<Long> itemIds;
        private List<Long> categoryIds;
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
        private String source;            // MANUAL | AUTO | UPSELL | CATEGORY | BEST_SELLER
        private BigDecimal discountAmount; // non-null for UPSELL source
        private String discountLabel;     // e.g. "₹30 off", "50% off"
    }

    @Data
    @Builder
    public static class CartRecommendationResponse {
        private List<RecommendationSuggestion> suggestions;
        private String resolvedBy;   // which priority level resolved it
    }
}

