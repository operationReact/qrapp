package com.broandbro.qrapp.foodcourt.dto;

import com.broandbro.qrapp.foodcourt.enums.LeaseStatus;
import com.broandbro.qrapp.foodcourt.enums.PaymentMethod;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/** Create/update payload for a stall lease. */
public record StallLeaseRequest(

        @NotNull(message = "stallId is required")
        UUID stallId,

        @NotNull(message = "tenantId is required")
        UUID tenantId,

        @NotNull(message = "startDate is required")
        LocalDate startDate,

        LocalDate endDate,

        @NotNull(message = "monthlyRent is required")
        @Positive(message = "monthlyRent must be positive")
        BigDecimal monthlyRent,

        BigDecimal depositAmount,
        Integer rentDueDay,
        PaymentMethod paymentMethod,
        LeaseStatus status,
        String notes
) {}
