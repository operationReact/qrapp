package com.broandbro.qrapp.analytics.projection;

import java.math.BigDecimal;

/**
 * Closed projection for coupon performance summary queries.
 */
public interface CouponPerformanceProjection {
    String getCouponCode();
    Long getCouponId();
    Long getTotalRedemptions();       // SUM across date range
    Long getSuccessfulRedemptions();
    Long getCancelledRedemptions();
    Long getUniqueUsers();
    BigDecimal getTotalDiscountGiven();
    BigDecimal getTotalRevenueGenerated();
    BigDecimal getAvgOrderValue();
    BigDecimal getDiscountCostRatio();
    Long getRepeatUserCount();
}

