package com.broandbro.qrapp.foodcourt.dto;

import com.broandbro.qrapp.foodcourt.enums.DepositType;
import com.broandbro.qrapp.foodcourt.enums.LeaseType;
import com.broandbro.qrapp.foodcourt.enums.PaymentMethod;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/** Create payload for a deposit / asset consideration. */
public record DepositRequest(

        @NotNull(message = "leaseType is required")
        LeaseType leaseType,

        UUID leaseId,
        UUID tenantId,

        @NotNull(message = "depositType is required")
        DepositType depositType,

        @NotNull(message = "amount is required")
        @PositiveOrZero(message = "amount must be >= 0")
        BigDecimal amount,

        LocalDate receivedDate,
        PaymentMethod paymentMethod,
        String assetDescription,
        String notes
) {}
