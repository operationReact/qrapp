package com.broandbro.qrapp.analytics.projection;

import java.math.BigDecimal;

public interface StallPerformanceProjection {
    Long getStallId();
    String getStallName();
    Long getOrders();
    BigDecimal getRevenue();
    BigDecimal getAverageOrderValue();
}
