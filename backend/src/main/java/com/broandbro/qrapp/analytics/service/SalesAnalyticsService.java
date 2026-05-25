package com.broandbro.qrapp.analytics.service;

import com.broandbro.qrapp.analytics.dto.DashboardSummaryResponse;
import com.broandbro.qrapp.analytics.dto.DailySalesResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * Contract for sales analytics read operations.
 */
public interface SalesAnalyticsService {

    /** Aggregate KPI summary for the dashboard KPI strip. */
    DashboardSummaryResponse getDashboardSummary(LocalDate from, LocalDate to);

    /** Daily time-series for line charts. */
    List<DailySalesResponse> getDailySeries(LocalDate from, LocalDate to);

    /** Returns the daily sales snapshot for the day before the given date, if present. */
    Optional<DailySalesResponse> findByPreviousDate(LocalDate date);

    /** Paged daily rows for table views. */
    Page<DailySalesResponse> getDailySeriesPaged(LocalDate from, LocalDate to, Pageable pageable);

    /** Convenience: last 7 days summary. */
    DashboardSummaryResponse getWeeklySummary();

    /** Convenience: last 30 days summary. */
    DashboardSummaryResponse getMonthlySummary();
}

