package com.broandbro.qrapp.dto;

import com.broandbro.qrapp.enums.DiscountType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Response DTO for coupon details.
 * Shows coupon configuration and current usage stats.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CouponResponse {
    private Long id;
    private String code;
    private String title;
    private String description;
    private DiscountType discountType;
    private BigDecimal discountValue;
    private BigDecimal minOrderAmount;
    private BigDecimal maxDiscountAmount;
    private LocalDateTime startsAt;
    private LocalDateTime expiresAt;
    private Integer totalUsageLimit;
    private Integer perUserLimit;
    private Boolean isFirstOrderOnly;
    private Boolean isActive;
    private String createdBy;
    private String updatedBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Runtime stats
    private Long totalRedemptions; // Total times used
    private Boolean isExpired;     // Whether coupon has expired
    private Boolean isNotStarted;  // Whether coupon hasn't started yet
    private Boolean isLimitReached; // Whether usage limit reached
}

