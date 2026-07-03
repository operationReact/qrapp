package com.broandbro.qrapp.analytics.dto;

import java.math.BigDecimal;

/** Aggregated coupon performance row for a date range. */
public record CouponPerformanceResponse(
        String couponCode,
        long couponId,
        long totalRedemptions,
        long successfulRedemptions,
        long cancelledRedemptions,
        long uniqueUsers,
        BigDecimal totalDiscountGiven,
        BigDecimal totalRevenueGenerated,
        BigDecimal avgOrderValue,
        BigDecimal discountCostRatio,
        long repeatUserCount,
        /** Conversion rate = successfulRedemptions / totalRedemptions * 100 */
        BigDecimal conversionRate
) {}

