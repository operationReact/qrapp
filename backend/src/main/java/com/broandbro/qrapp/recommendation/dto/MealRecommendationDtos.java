package com.broandbro.qrapp.recommendation.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

/**
 * DTOs for the "Complete Your Meal" recommendation endpoint.
 *
 * <p>Deliberately separate from {@link CartBundleDtos} so the two features
 * can evolve independently.
 */
public class MealRecommendationDtos {

    // ── Request ───────────────────────────────────────────────────────────────

    @Data
    public static class MealRecommendationRequest {
        /** IDs of items currently in the customer's cart. */
        private List<Long> cartItemIds;
        /** Current cart subtotal — used by the underlying recommendation engine. */
        private BigDecimal cartTotal;
    }

    // ── CompleteYourMeal V2 ───────────────────────────────────────────────────

    /**
     * Request for the new GET /api/recommendations/complete-meal endpoint.
     *
     * <p>Identifies the primary item the customer is ordering, and optionally
     * provides the full cart context for classification-aware fallback scoring.
     */
    @Data
    public static class CompleteYourMealRequest {
        /** The source item to find pairings / companions for (required). */
        private Long primaryItemId;
        /** All cart item IDs — used to exclude already-carted items from suggestions. */
        private List<Long> cartItemIds;
        /** Cart subtotal — forwarded to the RecommendationEngine for scoring. */
        private BigDecimal cartTotal;
    }

    /**
     * Response for GET /api/recommendations/complete-meal.
     *
     * <p>Each slot (drink / side / dessert) is {@code null} when no suitable item
     * could be found for that role.
     */
    @Data
    @Builder
    public static class CompleteYourMealResponse {
        // ── Source item ───────────────────────────────────────────────────────
        private Long   primaryItemId;
        private String primaryItemName;
        private String primaryItemImageUrl;

        // ── Companion slots ───────────────────────────────────────────────────
        /** Top DRINK pairing or engine fallback. Null if unavailable. */
        private MealItemView drink;
        /** Top SIDE pairing or engine fallback. Null if unavailable. */
        private MealItemView side;
        /** Top DESSERT pairing or engine fallback. Null if unavailable. */
        private MealItemView dessert;

        // ── Pricing ───────────────────────────────────────────────────────────
        /** Sum of all non-null companion item prices. */
        private BigDecimal originalPrice;
        /** Discount amount applied to the companion bundle. */
        private BigDecimal savings;
        /** originalPrice - savings. */
        private BigDecimal finalPrice;

        /**
         * How the companions were resolved:
         * <ul>
         *   <li>{@code PAIRING}        – all from admin-curated meal rules</li>
         *   <li>{@code PARTIAL}        – mix of meal rules + RecommendationEngine</li>
         *   <li>{@code RECOMMENDATION} – all from classification-aware RecommendationEngine</li>
         * </ul>
         */
        private String source;
    }

    // ── Response ──────────────────────────────────────────────────────────────

    @Data
    @Builder
    public static class MealRecommendationResponse {
        /**
         * Name of the PRIMARY item found in the cart (e.g. "Chicken Biryani").
         * {@code null} when no item in the cart carries the PRIMARY role.
         */
        private String mainItemName;

        /**
         * Recommended complementary items (Accompaniment, Drink, optional Dessert).
         * Never contains items already in the cart.
         */
        private List<MealItemView> mealItems;

        /** Sum of individual recommended item prices before the meal deal. */
        private BigDecimal originalPrice;

        /** Amount saved by taking the meal deal. */
        private BigDecimal savings;

        /** What the customer actually pays: originalPrice − savings. */
        private BigDecimal finalPrice;
    }

    /** One recommended item inside a meal suggestion. */
    @Data
    @Builder
    public static class MealItemView {
        private Long   itemId;
        private String itemName;
        private String imageUrl;
        private BigDecimal price;
        /** Canonical role: MAIN | SIDE | DRINK | DESSERT | ADDON */
        private String role;
    }

    // ── Admin DTOs ────────────────────────────────────────────────────────────

    /** Read-only view of a combo role, used in the admin role selector. */
    @Data
    @Builder
    public static class RoleView {
        private Long   id;
        private String name;
        private int    displayOrder;
    }

    /** Read-only view of a menu item together with its currently assigned role. */
    @Data
    @Builder
    public static class ItemRoleView {
        private Long   itemId;
        private String itemName;
        private String imageUrl;
        private String categoryName;
        /** Null when the item has no role assignment. */
        private Long   roleId;
        private String roleName;
    }
}

