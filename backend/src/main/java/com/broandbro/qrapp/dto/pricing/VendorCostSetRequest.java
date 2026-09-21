package com.broandbro.qrapp.dto.pricing;

import com.fasterxml.jackson.annotation.JsonAlias;
import java.math.BigDecimal;
import java.time.Instant;

/**
 * Request to set (or update) the procurement cost for a (vendor, menuItem) pair.
 *
 * @param vendorId       the vendor supplying the item
 * @param menuItemId   target menu item
 * @param costPrice    new procurement cost per unit (must be >= 0)
 * @param effectiveFrom when the cost takes effect (null = immediately)
 */
public record VendorCostSetRequest(
        @JsonAlias("shopId")
        Long vendorId,
        Long menuItemId,
        BigDecimal costPrice,
        Instant effectiveFrom
) {
    public VendorCostSetRequest {
        if (vendorId == null) throw new IllegalArgumentException("vendorId is required");
        if (menuItemId == null) throw new IllegalArgumentException("menuItemId is required");
        if (costPrice == null || costPrice.compareTo(BigDecimal.ZERO) < 0)
            throw new IllegalArgumentException("costPrice must be >= 0");
    }
}
