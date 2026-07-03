package com.broandbro.qrapp.analytics.dto;

/**
 * A single business insight or recommendation derived from profitability data.
 * Used in the profitability dashboard to surface actionable suggestions.
 */
public record ProfitabilityInsightResponse(
        InsightType type,
        String title,
        String message,
        String itemName,
        Long menuItemId,
        /** Current selling price — populated for MISSING_COST and LOW_MARGIN insights. */
        java.math.BigDecimal sellingPrice,
        /** Menu item image URL — null for global insights. */
        String imageUrl
) {
    public enum InsightType {
        /** High volume, low margin — consider price increase or cost reduction. */
        LOW_MARGIN_HIGH_VOLUME,
        /** Low volume, high margin — consider promoting to boost revenue. */
        HIGH_MARGIN_LOW_VOLUME,
        /** No cost configured — can't compute real margin. */
        MISSING_COST,
        /** Overall margin is healthy — positive indicator. */
        HEALTHY_MARGIN,
        /** Overall margin is thin — consider menu restructuring. */
        THIN_MARGIN
    }
}

