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

    // ── Response ──────────────────────────────────────────────────────────────

    @Data
    @Builder
    public static class MealRecommendationResponse {
        /**
         * Name of the MAIN item found in the cart (e.g. "Chicken Biryani").
         * {@code null} when no item in the cart carries the MAIN role.
         */
        private String mainItemName;

        /**
         * Recommended complementary items (Side, Drink, optional Dessert).
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
        /** Null when the item has no role assignment. */
        private Long   roleId;
        private String roleName;
    }
}

