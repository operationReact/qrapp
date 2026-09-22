package com.broandbro.qrapp.analytics.service;

import com.broandbro.qrapp.analytics.dto.ProfitabilityDashboardResponse;
import com.broandbro.qrapp.analytics.dto.TopMenuItemResponse;
import com.broandbro.qrapp.analytics.support.AnalyticsLocationScope;

import java.time.LocalDate;
import java.util.List;

/**
 * Profitability analytics service — computes profit, margin, and actionable insights
 * for menu items, combos, and daily sales.
 */
public interface ProfitabilityService {

    /** Full profitability dashboard for the given date range. */
    ProfitabilityDashboardResponse getProfitabilityDashboard(LocalDate from, LocalDate to, AnalyticsLocationScope scope);

    /** Top N most profitable items (by total profit amount). */
    List<TopMenuItemResponse> getMostProfitableItems(LocalDate from, LocalDate to, int limit, AnalyticsLocationScope scope);

    /** Top N items by profit margin %. */
    List<TopMenuItemResponse> getHighestMarginItems(LocalDate from, LocalDate to, int limit, AnalyticsLocationScope scope);
}
