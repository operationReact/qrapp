package com.broandbro.qrapp.recommendation.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/**
 * DTOs for the Item Pairing feature.
 */
public class ItemPairingDtos {

    // ── Request DTOs ──────────────────────────────────────────────────────────

    /**
     * Body for POST /api/admin/growth/item-pairings
     */
    @Data
    public static class AddPairingRequest {

        @NotNull
        private Long sourceItemId;

        @NotNull
        private Long targetItemId;

        /**
         * Role the target plays: DRINK | SIDE | DESSERT | ADDON.
         */
        @NotNull
        private String pairingRole;

        /**
         * Higher value = shown first when listing pairings for an item.
         * Defaults to 0.
         */
        private Integer priority = 0;
    }

    /**
     * Body for PATCH /api/admin/growth/item-pairings/{id}/priority
     */
    @Data
    public static class UpdatePriorityRequest {

        @NotNull
        private Integer priority;
    }

    /**
     * Body for PATCH /api/admin/growth/item-pairings/{id}/toggle
     * (no body needed — toggle inferred server-side; kept for future extension)
     */
    @Data
    public static class TogglePairingRequest {
        private Boolean isActive;
    }

    // ── Response DTOs ─────────────────────────────────────────────────────────

    @Data
    @Builder
    public static class ItemPairingResponse {

        private Long   id;

        // Source item (the item that owns this pairing)
        private Long   sourceItemId;
        private String sourceItemName;

        // Target item (the companion being recommended)
        private Long        targetItemId;
        private String      targetItemName;
        private String      targetItemImageUrl;
        private BigDecimal  targetItemPrice;    // live price, enriched by service

        /** DRINK | SIDE | DESSERT | ADDON */
        private String  pairingRole;

        /** Higher = shown first. */
        private Integer priority;

        private Boolean  isActive;
        private String   createdBy;
        private Instant  createdAt;
        private Instant  updatedAt;
    }

    /**
     * Grouped response returned by GetPairings — all pairings for one source item,
     * bucketed by role for easy UI consumption.
     */
    @Data
    @Builder
    public static class ItemPairingsGroupedResponse {

        private Long   sourceItemId;
        private String sourceItemName;

        private List<ItemPairingResponse> drinks;
        private List<ItemPairingResponse> sides;
        private List<ItemPairingResponse> desserts;
        private List<ItemPairingResponse> addons;

        /** Total active pairing count across all roles. */
        private int totalCount;
    }
}

