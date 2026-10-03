package com.broandbro.qrapp.foodcourt.dto;

import com.broandbro.qrapp.foodcourt.enums.LeaseStatus;
import com.broandbro.qrapp.foodcourt.enums.PaymentMethod;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/** Property (head) lease view. */
public record PropertyLeaseResponse(
        UUID id,
        UUID foodCourtId,
        UUID landlordId,
        String landlordName,
        LocalDate startDate,
        LocalDate endDate,
        BigDecimal monthlyRent,
        BigDecimal depositAmount,
        Integer rentDueDay,
        PaymentMethod paymentMethod,
        LeaseStatus status,
        String notes
) {}
