package com.broandbro.qrapp.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Request DTO for applying coupon to cart during checkout.
 * User sends this to validate and calculate discount.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApplyCouponRequest {
    /**
     * The coupon code entered by user.
     */
    private String couponCode;

    /**
     * Current order subtotal (before discount).
     */
    private BigDecimal orderSubtotal;
}

