package com.broandbro.qrapp.combo.dto.campaign;

import com.broandbro.qrapp.enums.DiscountType;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;

public record ComboCampaignTierRequest(

        @NotNull(message = "minItems is required")
        @Min(value = 2, message = "A tier must require at least 2 items")
        Integer minItems,

        @NotNull(message = "discountType is required")
        DiscountType discountType,

        @NotNull(message = "discountValue is required")
        @DecimalMin(value = "0.01", message = "Discount value must be > 0")
        BigDecimal discountValue,

        String tierLabel
) {}

