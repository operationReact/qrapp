package com.broandbro.qrapp.recommendation.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/** DTOs for the AI Combo Opportunity feature. */
public class ComboOpportunityDtos {

    // ── Responses ─────────────────────────────────────────────────────────────

    @Data @Builder
    public static class ComboOpportunityResponse {
        private Long id;
        private String comboName;
        private String status;
        // Quality
        private BigDecimal confidence;
        private Integer qualityScore;
        // Pricing
        private BigDecimal individualPrice;
        private BigDecimal suggestedPrice;
        private BigDecimal profit;
        private BigDecimal margin;
        private BigDecimal revenueImpact;
        private Integer attachmentConfidence;
        // Metadata
        private Integer coOrderCount;
        private List<String> reasons;
        // Items (with valid alternatives)
        private List<ComboOpportunityItemDto> items;
        // Audit
        private String reviewedBy;
        private Instant reviewedAt;
        private Instant generatedAt;
    }

    @Data @Builder
    public static class ComboOpportunityItemDto {
        private Long menuItemId;
        private String name;
        private BigDecimal price;
        private List<ComboOpportunityAlternativeDto> validAlternatives;
    }

    @Data @Builder
    public static class ComboOpportunityAlternativeDto {
        private Long menuItemId;
        private String name;
        private BigDecimal price;
    }

    @Data @Builder
    public static class MissedOpportunityResponse {
        private Long id;           // co-occurrence stat id used as identifier
        private String itemAName;
        private String itemBName;
        private Integer coOrderCount;
        private BigDecimal estimatedMissedRevenue;
        private BigDecimal expectedUplift;
    }

    // ── Requests ──────────────────────────────────────────────────────────────

    @Data
    public static class ReviewOpportunityRequest {
        /** "APPROVE" or "REJECT". */
        private String action;
    }

    @Data
    public static class UpdateOpportunityRequest {
        private String comboName;
        private BigDecimal suggestedPrice;
        private List<UpdateOpportunityItemDto> items;
    }

    @Data
    public static class UpdateOpportunityItemDto {
        private Long menuItemId;
        private String name;
        private BigDecimal price;
    }
}

