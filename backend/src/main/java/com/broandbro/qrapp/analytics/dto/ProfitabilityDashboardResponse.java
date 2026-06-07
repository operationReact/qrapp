package com.broandbro.qrapp.analytics.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Profitability-focused KPI dashboard response.
 * Returned by GET /api/v1/analytics/profitability/dashboard
 */
public record ProfitabilityDashboardResponse(
        LocalDate from,
        LocalDate to,
        BigDecimal totalRevenue,
        BigDecimal totalEstimatedCost,
        BigDecimal totalEstimatedProfit,
        BigDecimal avgProfitMargin,
        List<TopMenuItemResponse> mostProfitableItems,
        List<TopMenuItemResponse> highestMarginItems,
        List<ProfitabilityInsightResponse> insights
) {}


