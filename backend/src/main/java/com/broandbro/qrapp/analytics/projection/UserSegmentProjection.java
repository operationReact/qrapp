package com.broandbro.qrapp.analytics.projection;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Closed projection for user segment / retention queries.
 */
public interface UserSegmentProjection {
    Long getUserId();
    String getPhone();
    Integer getTotalOrders();
    Integer getCompletedOrders();
    BigDecimal getLifetimeSpend();
    BigDecimal getAvgOrderValue();
    LocalDateTime getFirstOrderAt();
    LocalDateTime getLastOrderAt();
    BigDecimal getAvgOrderFrequencyDays();
    String getCustomerSegment();
    Boolean getIsChurned();
    Integer getCouponsUsed();
    BigDecimal getTotalCouponDiscount();
}

