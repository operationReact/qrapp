package com.broandbro.qrapp.dto;

import com.broandbro.qrapp.enums.DiscountType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Request DTO for creating or updating a coupon.
 * Admin uses this to define coupon rules.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CouponCreateUpdateRequest {
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
}

