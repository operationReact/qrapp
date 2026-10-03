package com.broandbro.qrapp.foodcourt.dto;

import com.broandbro.qrapp.foodcourt.enums.RentInvoiceStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/** Rent invoice view. */
public record RentInvoiceResponse(
        UUID id,
        UUID foodCourtId,
        UUID stallLeaseId,
        UUID stallId,
        String stallCode,
        UUID tenantId,
        String tenantName,
        Integer periodYear,
        Integer periodMonth,
        LocalDate dueDate,
        BigDecimal rentAmount,
        BigDecimal adjustmentTotal,
        BigDecimal netAmount,
        BigDecimal amountPaid,
        BigDecimal balanceDue,
        RentInvoiceStatus status,
        String notes,
        long overdueDays
) {}
