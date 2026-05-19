package com.broandbro.qrapp.dto.pricing;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Request to set (or update) the procurement cost for a (shop, menuItem) pair.
 *
 * @param shopId       the vendor/shop supplying the item
 * @param menuItemId   target menu item
 * @param costPrice    new procurement cost per unit (must be >= 0)
 * @param effectiveFrom when the cost takes effect (null = immediately)
 */
public record VendorCostSetRequest(
        Long shopId,
        Long menuItemId,
        BigDecimal costPrice,
        Instant effectiveFrom
) {
    public VendorCostSetRequest {
        if (shopId == null) throw new IllegalArgumentException("shopId is required");
        if (menuItemId == null) throw new IllegalArgumentException("menuItemId is required");
        if (costPrice == null || costPrice.compareTo(BigDecimal.ZERO) < 0)
            throw new IllegalArgumentException("costPrice must be >= 0");
    }
}

