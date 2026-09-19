package com.broandbro.qrapp.analytics.dto;

import java.math.BigDecimal;

/** Completed-order performance for a food stall in a selected date range. */
public record StallPerformanceResponse(
        Long stallId,
        String stallName,
        long orders,
        BigDecimal revenue,
        BigDecimal averageOrderValue
) {}
