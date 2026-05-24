package com.broandbro.qrapp.analytics.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Single hourly bucket in the order heatmap. */
public record HourlyOrderResponse(
        LocalDate orderDate,
        int hourOfDay,
        int dayOfWeek,
        long orderCount,
        long completedCount,
        BigDecimal hourRevenue,
        BigDecimal avgFulfilmentMinutes
) {}

