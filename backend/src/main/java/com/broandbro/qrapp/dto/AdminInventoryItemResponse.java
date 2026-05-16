package com.broandbro.qrapp.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * Admin-facing inventory item response for the inventory management screen.
 *
 * Contains all fields needed for:
 * - displaying the item row in the admin list
 * - showing low-stock indicator
 * - toggling hidden / in-stock status
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AdminInventoryItemResponse {

    private Long menuItemId;
    private String itemName;


    private Long availableQuantity;
    private Long lowStockThreshold;

    /** true when availableQuantity <= lowStockThreshold */
    private Boolean isLowStock;

    private Boolean isHidden;

    /**
     * Derived at query time:
     *   UNLIMITED items → true  (unless hidden)
     *   LIMITED items   → availableQuantity > 0  (and not hidden)
     */
    private Boolean isOrderable;

    /** Optimistic-lock version exposed for frontend concurrency checks (optional) */
    private Long version;

    private Instant updatedAt;
}
