package com.broandbro.qrapp.dto.pricing;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Read-only response representing a single entry in a menu item's selling price history.
 */
public record SellingPriceHistoryResponse(
        Long    id,
        BigDecimal sellingPrice,
        Instant effectiveFrom,
        Instant effectiveTo,
        String  reason,
        Instant createdAt
) {}

