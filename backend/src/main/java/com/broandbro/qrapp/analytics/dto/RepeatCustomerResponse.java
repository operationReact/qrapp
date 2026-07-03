package com.broandbro.qrapp.analytics.dto;

import java.math.BigDecimal;

/**
 * Lightweight row for the "Most Active Users" table on the User Analytics dashboard.
 */
public record RepeatCustomerResponse(
        Long userId,
        String userName,
        int orderCount,
        BigDecimal totalSpend,
        String favoriteItem
) {}

