package com.broandbro.qrapp.analytics.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Single-day row in the sales time series. */
public record DailySalesResponse(
        LocalDate salesDate,
        int totalOrders,
        int completedOrders,
        int cancelledOrders,
        BigDecimal totalRevenue,
        BigDecimal netRevenue,
        BigDecimal totalDiscount,
        BigDecimal averageOrderValue,
        int uniqueCustomers,
        int newCustomers,
        int totalItemsSold,
        BigDecimal walletRevenue,
        BigDecimal onlineRevenue,
        BigDecimal codRevenue
) {}

