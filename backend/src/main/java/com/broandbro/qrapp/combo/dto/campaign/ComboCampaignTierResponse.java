package com.broandbro.qrapp.combo.dto.campaign;

import com.broandbro.qrapp.enums.DiscountType;

import java.math.BigDecimal;

public record ComboCampaignTierResponse(
        Long id,
        Integer minItems,
        DiscountType discountType,
        BigDecimal discountValue,
        String tierLabel,
        Integer sortOrder
) {}

