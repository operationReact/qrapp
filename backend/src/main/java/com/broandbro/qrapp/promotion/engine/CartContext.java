package com.broandbro.qrapp.promotion.engine;

import java.math.BigDecimal;
import java.util.List;

public record CartContext(
        Long restaurantId,
        BigDecimal subtotal,
        BigDecimal deliveryFee,
        List<CartItemContext> items
) {}

