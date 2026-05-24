package com.broandbro.qrapp.analytics.dto;

import java.math.BigDecimal;

/** Ranked menu item row for top-sellers table / chart. */
public record TopMenuItemResponse(
        long menuItemId,
        String menuItemName,
        Long categoryId,
        String categoryName,
        long totalQtySold,
        BigDecimal totalRevenue,
        long totalOrderCount,
        BigDecimal avgSellingPrice,
        int rank
) {}

