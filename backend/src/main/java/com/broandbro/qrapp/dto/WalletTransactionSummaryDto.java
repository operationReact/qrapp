package com.broandbro.qrapp.dto;

import com.broandbro.qrapp.enums.TransactionStatus;
import com.broandbro.qrapp.enums.TransactionType;

import java.time.Instant;
import java.math.BigDecimal;

public record WalletTransactionSummaryDto(
        Long id,
        BigDecimal amount,
        TransactionType type,
        TransactionStatus status,
        String referenceId,
        String providerOrderId,
        Long orderId,
        String description,
        BigDecimal balanceAfter,
        Instant createdAt
) {
}
