package com.broandbro.qrapp.promotion.engine;

import java.math.BigDecimal;

public record CartItemContext(
        Long menuItemId,
        Long categoryId,
        int quantity,
        BigDecimal unitPrice
) {}

