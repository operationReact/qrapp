package com.broandbro.qrapp.dto.pricing;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Read-only response representing a single entry in a vendor's cost history for a menu item.
 */
public record VendorCostHistoryResponse(
        Long   id,
        Long   shopId,
        BigDecimal costPrice,
        Instant effectiveFrom,
        Instant effectiveTo,
        Instant createdAt
) {}

