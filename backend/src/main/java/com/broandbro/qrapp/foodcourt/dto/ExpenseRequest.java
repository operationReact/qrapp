package com.broandbro.qrapp.foodcourt.dto;

import com.broandbro.qrapp.foodcourt.enums.ExpenseCategory;
import com.broandbro.qrapp.foodcourt.enums.PaymentMethod;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Create/update payload for an operating expense. */
public record ExpenseRequest(

        @NotNull(message = "category is required")
        ExpenseCategory category,

        @NotNull(message = "amount is required")
        @Positive(message = "amount must be positive")
        BigDecimal amount,

        @NotNull(message = "expenseDate is required")
        LocalDate expenseDate,

        PaymentMethod paymentMethod,
        String vendorName,
        String description
) {}
