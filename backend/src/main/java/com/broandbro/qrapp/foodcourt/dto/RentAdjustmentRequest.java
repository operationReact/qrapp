package com.broandbro.qrapp.foodcourt.dto;

import com.broandbro.qrapp.foodcourt.enums.AdjustmentType;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

/**
 * Payload to apply a signed adjustment to a rent invoice. A negative amount
 * reduces what is owed (discount/waiver); a positive amount increases it
 * (late fee/correction).
 */
public record RentAdjustmentRequest(

        @NotNull(message = "adjustmentType is required")
        AdjustmentType adjustmentType,

        @NotNull(message = "amount is required")
        BigDecimal amount,

        String reason
) {}
