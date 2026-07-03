package com.broandbro.qrapp.analytics.projection;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Closed projection for daily sales summary queries.
 * Maps directly to SELECT aliases in {@code DailySalesAnalyticsRepository}.
 */
public interface DailySalesSummaryProjection {
    LocalDate getSalesDate();
    Integer getTotalOrders();
    Integer getCompletedOrders();
    Integer getCancelledOrders();
    BigDecimal getTotalRevenue();
    BigDecimal getNetRevenue();
    BigDecimal getTotalDiscount();
    BigDecimal getAverageOrderValue();
    Integer getUniqueCustomers();
    Integer getNewCustomers();
    Integer getTotalItemsSold();
}

