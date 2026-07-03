package com.broandbro.qrapp.analytics.projection;

import java.math.BigDecimal;

/**
 * Closed projection for hourly order heatmap queries.
 */
public interface HourlyOrderSummaryProjection {
    Integer getHourOfDay();
    Integer getDayOfWeek();
    Long getTotalOrderCount();         // SUM across a date range
    Long getTotalCompletedCount();
    BigDecimal getTotalRevenue();
    BigDecimal getAvgFulfilmentMinutes();
}

