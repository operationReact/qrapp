package com.broandbro.qrapp.foodcourt.dto;

import com.broandbro.qrapp.foodcourt.enums.AdjustmentType;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/** Rent adjustment view. */
public record RentAdjustmentResponse(
        UUID id,
        UUID foodCourtId,
        UUID rentInvoiceId,
        AdjustmentType adjustmentType,
        BigDecimal amount,
        String reason,
        String appliedBy,
        Instant createdAt
) {}
