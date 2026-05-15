package com.broandbro.qrapp.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Response DTO for coupon analytics and redemption history.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CouponAnalyticsResponse {
    private Long couponId;
    private String couponCode;
    private String couponTitle;

    // Usage stats
    private Long totalRedemptions;
    private Long remainingUsageLimit;

    // Revenue impact
    private BigDecimal totalDiscountGiven;
    private BigDecimal averageDiscountPerOrder;
    private BigDecimal totalRevenueGenerated; // From orders with this coupon
    private BigDecimal averageOrderValue;

    // User engagement
    private Long uniqueUsers;
    private Double conversionPercentage;

    // Time-based info
    private LocalDateTime couponStartDate;
    private LocalDateTime couponExpireDate;
    private Boolean isActive;
}

