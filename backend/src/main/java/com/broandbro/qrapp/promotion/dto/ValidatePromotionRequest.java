package com.broandbro.qrapp.promotion.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class ValidatePromotionRequest {
    private String promotionCode;
    private Long restaurantId;
    private BigDecimal subtotal;
    private BigDecimal deliveryFee;
    private List<CheckoutPromotionsRequest.CartItemRequest> items;
}

