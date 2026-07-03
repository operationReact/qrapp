package com.broandbro.qrapp.analytics.dto;

import java.math.BigDecimal;

/**
 * Aggregated KPI snapshot returned by GET /api/v1/analytics/overview.
 *
 * <p>All trend values are percentage change vs. the previous day.
 * A positive value means an increase; negative means a decrease.
 * {@code null} means there is no comparison data (e.g. first ever day).</p>
 */
public record OverviewKpiResponse(

        /** Gross revenue for today (completed orders only). */
        BigDecimal revenueToday,

        /** % change in revenue vs yesterday. Null when no yesterday data. */
        Double revenueTrend,

        /** Number of completed orders today. */
        long ordersToday,

        /** % change in order count vs yesterday. */
        Double ordersTrend,

        /** Average order value today. */
        BigDecimal avgOrderValue,

        /** % change in AOV vs yesterday. */
        Double aovTrend,

        /** Human-readable peak hour label, e.g. "12P" or "6P". Null if no orders yet. */
        String peakHour,

        /** Name of the top-selling item (by revenue) in the last 7 days. */
        String topSellingItem,

        /** Count of currently active promotions. */
        long activePromotions

) {}

