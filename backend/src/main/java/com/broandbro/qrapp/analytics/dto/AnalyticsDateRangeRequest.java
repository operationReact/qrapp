package com.broandbro.qrapp.analytics.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDate;

/**
 * Common date-range filter applied to all analytics query endpoints.
 */
public record AnalyticsDateRangeRequest(

        @NotNull(message = "from date is required")
        @PastOrPresent(message = "from date cannot be in the future")
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
        LocalDate from,

        @NotNull(message = "to date is required")
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
        LocalDate to
) {
    public AnalyticsDateRangeRequest {
        if (from != null && to != null && from.isAfter(to)) {
            throw new IllegalArgumentException("'from' must not be after 'to'");
        }
        if (from != null && to != null && java.time.temporal.ChronoUnit.DAYS.between(from, to) > 365) {
            throw new IllegalArgumentException("Date range must not exceed 365 days");
        }
    }

    /** Returns a default last-30-days range when no explicit range is needed. */
    public static AnalyticsDateRangeRequest last30Days() {
        LocalDate today = LocalDate.now();
        return new AnalyticsDateRangeRequest(today.minusDays(29), today);
    }

    public static AnalyticsDateRangeRequest last7Days() {
        LocalDate today = LocalDate.now();
        return new AnalyticsDateRangeRequest(today.minusDays(6), today);
    }
}

