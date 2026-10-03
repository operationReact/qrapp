package com.broandbro.qrapp.foodcourt.dto;

import com.broandbro.qrapp.foodcourt.enums.DepositStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

/** Settlement payload for a deposit (refund / forfeit / adjust). */
public record DepositSettlementRequest(

        @NotNull(message = "status is required")
        DepositStatus status,

        @Positive(message = "amount must be positive")
        BigDecimal refundAmount,

        String notes
) {}
