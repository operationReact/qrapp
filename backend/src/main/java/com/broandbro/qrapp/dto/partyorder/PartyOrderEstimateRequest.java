package com.broandbro.qrapp.dto.partyorder;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;

public record PartyOrderEstimateRequest(

        @NotNull(message = "Estimated amount is required")
        @DecimalMin(value = "1.00", message = "Estimated amount must be greater than zero")
        BigDecimal estimatedAmount,

        @Size(max = 10)
        String currency,

        @Size(max = 2000, message = "Note must not exceed 2000 characters")
        String estimateNote
) {}

