package com.broandbro.qrapp.dto.pricing;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Request to set (or update) the selling price for a menu item.
 *
 * @param menuItemId   target menu item
 * @param sellingPrice new selling price (must be > 0)
 * @param effectiveFrom when the price takes effect (null = immediately)
 * @param reason        human-readable reason for the change
 */
public record PriceSetRequest(
        Long menuItemId,
        BigDecimal sellingPrice,
        Instant effectiveFrom,
        String reason
) {
    public PriceSetRequest {
        if (menuItemId == null) throw new IllegalArgumentException("menuItemId is required");
        if (sellingPrice == null || sellingPrice.compareTo(BigDecimal.ZERO) <= 0)
            throw new IllegalArgumentException("sellingPrice must be > 0");
    }
}

