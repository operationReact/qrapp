package com.broandbro.qrapp.analytics.dto;

import java.math.BigDecimal;

/** Aggregated peak-hour row (summed over a date range). */
public record PeakHourResponse(
        int hourOfDay,
        String hourLabel,          // e.g. "13:00 – 13:59"
        int dayOfWeek,
        long totalOrderCount,
        long totalCompletedCount,
        BigDecimal totalRevenue,
        BigDecimal avgFulfilmentMinutes,
        boolean isPeak             // true if order count > average across all hours
) {}

