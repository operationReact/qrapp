package com.broandbro.qrapp.foodcourt.dto;

import com.broandbro.qrapp.foodcourt.enums.PaymentMethod;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/** Rent payment view. */
public record RentPaymentResponse(
        UUID id,
        UUID foodCourtId,
        UUID rentInvoiceId,
        BigDecimal amount,
        PaymentMethod paymentMethod,
        Instant paidAt,
        String reference,
        String recordedBy,
        String notes
) {}
