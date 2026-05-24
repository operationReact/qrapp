package com.broandbro.qrapp.analytics.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/** Top-level dashboard KPI strip — aggregated over a date range. */
public record DashboardSummaryResponse(
        LocalDate from,
        LocalDate to,
        BigDecimal totalRevenue,
        BigDecimal netRevenue,
        BigDecimal totalDiscount,
        long totalOrders,
        long completedOrders,
        long cancelledOrders,
        BigDecimal averageOrderValue,
        long uniqueCustomers,
        long newCustomers,
        long totalItemsSold,
        BigDecimal walletRevenue,
        BigDecimal onlineRevenue,
        BigDecimal codRevenue,
        List<DailySalesResponse> dailySeries
) {}

