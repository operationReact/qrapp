package com.broandbro.qrapp.analytics.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/** Full user preference and segmentation profile. */
public record UserPreferenceResponse(
        long userId,
        String phone,
        int totalOrders,
        int completedOrders,
        int cancelledOrders,
        BigDecimal lifetimeSpend,
        BigDecimal avgOrderValue,
        BigDecimal maxOrderValue,
        LocalDateTime firstOrderAt,
        LocalDateTime lastOrderAt,
        BigDecimal avgOrderFrequencyDays,
        List<Long> preferredCategoryIds,
        List<Long> preferredItemIds,
        String customerSegment,
        boolean isChurned,
        int couponsUsed,
        BigDecimal totalCouponDiscount
) {}

