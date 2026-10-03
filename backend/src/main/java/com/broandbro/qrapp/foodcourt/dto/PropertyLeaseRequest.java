package com.broandbro.qrapp.foodcourt.dto;

import com.broandbro.qrapp.foodcourt.enums.LeaseStatus;
import com.broandbro.qrapp.foodcourt.enums.PaymentMethod;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Create/update payload for the landlord property (head) lease. Dates and
 * payment method are nullable to support historical agreements with unknown
 * terms.
 */
public record PropertyLeaseRequest(

        @NotNull(message = "landlordId is required")
        UUID landlordId,

        LocalDate startDate,
        LocalDate endDate,
        BigDecimal monthlyRent,
        BigDecimal depositAmount,
        Integer rentDueDay,
        PaymentMethod paymentMethod,
        LeaseStatus status,
        String notes
) {}
