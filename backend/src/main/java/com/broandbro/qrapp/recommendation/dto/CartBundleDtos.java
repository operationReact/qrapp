package com.broandbro.qrapp.recommendation.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

/**
 * DTOs for the V1 Recommended Bundle endpoint.
 *
 * Deliberately kept separate from {@link RecommendationDtos} so the
 * bundle surface area is easy to find, modify, and eventually move to
 * its own package if the feature grows.
 */
public class CartBundleDtos {

    // ── Request ───────────────────────────────────────────────────────────────

    /**
     * Sent by the frontend when asking for a bundle recommendation.
     * Only requires the IDs of items already in the cart — everything
     * else (pricing, suggestions) is resolved server-side.
     */
    @Data
    public static class CartBundleRequest {
        /** IDs of items currently in the customer's cart. */
        private List<Long> cartItemIds;
        /**
         * Current cart subtotal — passed through to the recommendation
         * engine so upsell / category-pairing rules can be ranked by value.
         * Optional; defaults to 0 if omitted.
         */
        private BigDecimal cartTotal;
    }

    // ── Response ──────────────────────────────────────────────────────────────

    /**
     * A lightweight, ready-to-render bundle surfaced to the customer.
     * Contains only the items the recommendation engine suggested
     * (i.e. items NOT already in the cart).
     */
    @Data
    @Builder
    public static class CartBundleResponse {
        /** Items recommended to complement the current cart. */
        private List<BundleItemView> bundleItems;

        /** Sum of individual selling prices (before the bundle saving). */
        private BigDecimal originalPrice;

        /** Amount saved by taking the bundle deal. */
        private BigDecimal savings;

        /** What the customer actually pays: originalPrice − savings. */
        private BigDecimal finalPrice;
    }

    /**
     * A single line item inside the bundle recommendation.
     */
    @Data
    @Builder
    public static class BundleItemView {
        private Long   itemId;
        private String itemName;
        private String imageUrl;
        /** Current selling price for this item. */
        private BigDecimal price;
    }
}

