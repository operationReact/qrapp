package com.broandbro.qrapp.foodcourt.dto;

import com.broandbro.qrapp.foodcourt.enums.LeaseStatus;
import com.broandbro.qrapp.foodcourt.enums.PaymentMethod;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/** Stall lease view. */
public record StallLeaseResponse(
        UUID id,
        UUID foodCourtId,
        UUID stallId,
        String stallCode,
        UUID tenantId,
        String tenantName,
        LocalDate startDate,
        LocalDate endDate,
        BigDecimal monthlyRent,
        BigDecimal depositAmount,
        Integer rentDueDay,
        PaymentMethod paymentMethod,
        LeaseStatus status,
        String notes
) {}
