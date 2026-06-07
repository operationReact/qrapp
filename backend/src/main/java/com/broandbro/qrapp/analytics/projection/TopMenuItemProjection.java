package com.broandbro.qrapp.analytics.projection;

import java.math.BigDecimal;

/**
 * Closed projection for top-selling menu item queries.
 */
public interface TopMenuItemProjection {
    Long getMenuItemId();
    String getMenuItemName();
    Long getCategoryId();
    String getCategoryName();
    Long getTotalQtySold();           // SUM across a date range
    BigDecimal getTotalRevenue();
    Long getTotalOrderCount();
    BigDecimal getAvgSellingPrice();
    Integer getRevenueRank();

    // ── Profitability fields (null when not computed by the query) ─────────
    BigDecimal getTotalCost();
    BigDecimal getTotalProfit();
    BigDecimal getAvgProfitMargin();
}

