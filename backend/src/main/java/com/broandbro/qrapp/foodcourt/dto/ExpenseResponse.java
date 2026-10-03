package com.broandbro.qrapp.foodcourt.dto;

import com.broandbro.qrapp.foodcourt.enums.ExpenseCategory;
import com.broandbro.qrapp.foodcourt.enums.PaymentMethod;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/** Expense view. */
public record ExpenseResponse(
        UUID id,
        UUID foodCourtId,
        ExpenseCategory category,
        BigDecimal amount,
        LocalDate expenseDate,
        PaymentMethod paymentMethod,
        String vendorName,
        String description,
        String recordedBy
) {}
