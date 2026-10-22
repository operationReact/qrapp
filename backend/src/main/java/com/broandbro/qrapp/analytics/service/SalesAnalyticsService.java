package com.broandbro.qrapp.analytics.service;

import com.broandbro.qrapp.analytics.dto.DashboardSummaryResponse;
import com.broandbro.qrapp.analytics.dto.DailySalesResponse;
import com.broandbro.qrapp.analytics.dto.RetailGstSummaryResponse;
import com.broandbro.qrapp.analytics.support.AnalyticsLocationScope;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * Contract for sales analytics read operations.
 *
 * <p>Every method takes an {@link AnalyticsLocationScope} so results are scoped to
 * the locations the caller may see. An "all locations" scope (SUPER_ADMIN) applies
 * no location filter; a restricted scope limits results to the given location IDs.</p>
 */
public interface SalesAnalyticsService {

    /** Aggregate KPI summary for the dashboard KPI strip. */
    DashboardSummaryResponse getDashboardSummary(LocalDate from, LocalDate to, AnalyticsLocationScope scope);

    /** MRP (retail product) sales and GST for the range, computed live from completed orders. */
    RetailGstSummaryResponse getRetailGstSummary(LocalDate from, LocalDate to, AnalyticsLocationScope scope);

    /** Daily time-series for line charts. */
    List<DailySalesResponse> getDailySeries(LocalDate from, LocalDate to, AnalyticsLocationScope scope);

    /** Returns the daily sales snapshot for the day before the given date, if present. */
    Optional<DailySalesResponse> findByPreviousDate(LocalDate date, AnalyticsLocationScope scope);

    /** Paged daily rows for table views. */
    Page<DailySalesResponse> getDailySeriesPaged(LocalDate from, LocalDate to, AnalyticsLocationScope scope, Pageable pageable);

    /** Convenience: last 7 days summary. */
    DashboardSummaryResponse getWeeklySummary(AnalyticsLocationScope scope);

    /** Convenience: last 30 days summary. */
    DashboardSummaryResponse getMonthlySummary(AnalyticsLocationScope scope);
}

