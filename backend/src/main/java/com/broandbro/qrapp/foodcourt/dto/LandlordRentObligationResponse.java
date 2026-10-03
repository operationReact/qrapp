package com.broandbro.qrapp.foodcourt.dto;

import com.broandbro.qrapp.foodcourt.enums.LandlordRentStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record LandlordRentObligationResponse(
        UUID id,
        UUID foodCourtId,
        UUID propertyLeaseId,
        int billingYear,
        int billingMonth,
        LocalDate dueDate,
        BigDecimal expectedAmount,
        BigDecimal paidAmount,
        BigDecimal outstandingAmount,
        LandlordRentStatus status
) {}
