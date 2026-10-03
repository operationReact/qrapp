package com.broandbro.qrapp.foodcourt.dto;

import com.broandbro.qrapp.foodcourt.enums.DepositStatus;
import com.broandbro.qrapp.foodcourt.enums.DepositType;
import com.broandbro.qrapp.foodcourt.enums.LeaseType;
import com.broandbro.qrapp.foodcourt.enums.PaymentMethod;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/** Deposit view. */
public record DepositResponse(
        UUID id,
        UUID foodCourtId,
        LeaseType leaseType,
        UUID leaseId,
        UUID tenantId,
        DepositType depositType,
        BigDecimal amount,
        BigDecimal refundedAmount,
        DepositStatus status,
        LocalDate receivedDate,
        PaymentMethod paymentMethod,
        String assetDescription,
        String notes
) {}
