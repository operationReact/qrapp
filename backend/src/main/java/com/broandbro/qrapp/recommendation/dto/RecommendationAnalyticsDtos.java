package com.broandbro.qrapp.recommendation.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/**
 * DTOs for Recommendation Interaction Tracking and Pairing Analytics.
 *
 * <p>These are deliberately kept separate from {@link MealRecommendationDtos} so
 * the tracking and analytics features can evolve independently.
 */
public class RecommendationAnalyticsDtos {

    // ── Tracking Requests ─────────────────────────────────────────────────────

    /**
     * Sent by the frontend when the customer interacts with a recommendation widget.
     *
     * <p>One request per interaction event — the frontend sends three separate
     * requests for VIEWED → ACCEPTED or VIEWED → REJECTED.
     */
    @Data
    public static class TrackInteractionRequest {

        /**
         * The restaurant location the customer is ordering from.
         * Used for multi-vendor data isolation.
         */
        private Long restaurantId;

        /**
         * Authenticated customer's user ID — send {@code null} for anonymous sessions.
         */
        private Long customerId;

        /**
         * The primary item the customer has in context (e.g. just added to cart).
         */
        private Long sourceItemId;

        /**
         * The item that was surfaced as a recommendation.
         */
        private Long recommendedItemId;

        /**
         * What happened: VIEWED | ACCEPTED | REJECTED
         */
        private String interactionType;

        // ── Extension Point Fields (optional, for future features) ────────────

        /**
         * [FUTURE: Auto-Learning Pairings / AI Suggestions]
         * Browser or app session token. When provided, enables session-level
         * co-acceptance mining for auto-learning pairing improvements.
         */
        private String sessionId;

        /**
         * [FUTURE: Recommendation Scoring]
         * Which engine resolved this recommendation: PAIRING | RECOMMENDATION | ENGINE.
         * Pass this value from the {@code MealRecommendationResponse} or cart suggestion {@code resolvedBy}.
         */
        private String resolvedBy;

        /**
         * [FUTURE: AI Suggestions]
         * Meal role of the recommended item: DRINK | SIDE | DESSERT | ADDON.
         * Pass this from {@code MealItemView.role} on the frontend.
         */
        private String pairingRole;

        /** The cart rule that produced the suggestion. Null for non-rule sources. */
        private Long ruleId;
    }

    // ── Analytics Response DTOs ───────────────────────────────────────────────

    /** Acceptance stats for one cart rule, shown on the rules admin page. */
    @Data
    @Builder
    public static class RuleStat {
        private Long ruleId;
        private long views;
        private long acceptances;
        /** Acceptances / views × 100, or null when the rule has no views yet. */
        private BigDecimal acceptanceRate;
    }

    /**
     * Per-pairing analytics aggregated from {@code rec_interaction}.
     *
     * <p>Acceptance rate = (acceptances / views) × 100.
     * A pairing with zero views has {@code null} acceptance rate.
     */
    @Data
    @Builder
    public static class PairingStat {
        private Long   sourceItemId;
        private String sourceItemName;
        private Long   recommendedItemId;
        private String recommendedItemName;
        private String recommendedItemImageUrl;

        /** Total VIEWED interactions for this pairing. */
        private long   views;
        /** Total ACCEPTED interactions for this pairing. */
        private long   acceptances;
        /** Total REJECTED interactions for this pairing. */
        private long   rejections;

        /**
         * Acceptance rate in percent (0–100), or {@code null} when {@code views == 0}.
         * Formula: acceptances / views × 100, rounded to 2 decimal places.
         */
        private BigDecimal acceptanceRate;

        /**
         * Rejection rate in percent (0–100), or {@code null} when {@code views == 0}.
         * Formula: rejections / views × 100, rounded to 2 decimal places.
         */
        private BigDecimal rejectionRate;
    }

    /**
     * Overall restaurant-level recommendation analytics summary.
     */
    @Data
    @Builder
    public static class OverallAnalyticsSummary {
        /** Total VIEWED events across all pairings for this restaurant. */
        private long totalViews;

        /** Total ACCEPTED events across all pairings. */
        private long totalAcceptances;

        /** Total REJECTED events across all pairings. */
        private long totalRejections;

        /**
         * Overall acceptance rate: totalAcceptances / totalViews × 100.
         * {@code null} when totalViews == 0.
         */
        private BigDecimal acceptanceRate;

        /**
         * Overall rejection rate: totalRejections / totalViews × 100.
         * {@code null} when totalViews == 0.
         */
        private BigDecimal rejectionRate;
    }

    /**
     * Full analytics dashboard response returned by
     * {@code GET /api/recommendations/analytics?restaurantId=X}.
     *
     * <p>Contains both the headline summary and the per-pairing breakdowns
     * needed to populate the four admin dashboard cards.
     */
    @Data
    @Builder
    public static class RecommendationAnalyticsDashboard {

        // ── Dashboard Cards ───────────────────────────────────────────────────

        /** Card: total recommendation widget views for this restaurant. */
        private long recommendationViews;

        /**
         * Card: overall acceptance rate (%) across all pairings.
         * {@code null} when there are no views yet.
         */
        private BigDecimal overallAcceptanceRate;

        /** Card: the pairing with the most views (most-shown to customers). */
        private PairingStat topPairing;

        /** Card: the pairing with the highest acceptance rate (best converter). */
        private PairingStat highestConvertingPairing;

        // ── Full Lists (for detail tables) ────────────────────────────────────

        /**
         * All pairings sorted by views DESC.
         * Answers: "Which pairings are shown the most?"
         */
        private List<PairingStat> topPairings;

        /**
         * Top 10 pairings sorted by acceptances DESC.
         * Answers: "Which pairings get added to cart most often?"
         */
        private List<PairingStat> mostAcceptedPairings;

        /**
         * Top 10 pairings sorted by rejections DESC.
         * Answers: "Which pairings get dismissed most often?"
         */
        private List<PairingStat> leastAcceptedPairings;

        /**
         * Top 10 pairings sorted by acceptance rate DESC (min 5 views for significance).
         * Answers: "Which pairings convert the best?"
         */
        private List<PairingStat> highestConversionPairings;

        /** Snapshot timestamp so the UI can show "last updated at". */
        private Instant generatedAt;
    }

    // ── Tracking Response ─────────────────────────────────────────────────────

    /** Minimal acknowledgement returned after a successful tracking call. */
    @Data
    @Builder
    public static class TrackInteractionResponse {
        private Long   interactionId;
        private String message;
    }
}
