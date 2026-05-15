package com.broandbro.qrapp.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Response DTO after applying coupon.
 * Shows whether coupon is valid and the calculated discount.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApplyCouponResponse {
    /**
     * Whether the coupon was successfully applied.
     */
    private Boolean isValid;

    /**
     * Coupon code.
     */
    private String couponCode;

    /**
     * Discount amount that will be applied (in smallest currency unit).
     * Only set if isValid is true.
     */
    private BigDecimal discountAmount;

    /**
     * Error message if coupon is invalid.
     * Only set if isValid is false.
     */
    private String errorMessage;

    /**
     * Human-readable discount description.
     * Example: "₹50 off" or "20% off (max ₹100)"
     */
    private String discountDescription;
}

