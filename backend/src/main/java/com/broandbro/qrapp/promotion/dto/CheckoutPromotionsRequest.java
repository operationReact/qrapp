package com.broandbro.qrapp.promotion.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class CheckoutPromotionsRequest {
    private Long restaurantId;
    private BigDecimal subtotal;
    private BigDecimal deliveryFee;
    private List<CartItemRequest> items;

    @Data
    public static class CartItemRequest {
        private Long menuItemId;
        private Long categoryId;
        private int quantity;
        private BigDecimal unitPrice;
    }
}

