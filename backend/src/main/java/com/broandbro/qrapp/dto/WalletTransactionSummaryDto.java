package com.broandbro.qrapp.dto;

import com.broandbro.qrapp.enums.TransactionStatus;
import com.broandbro.qrapp.enums.TransactionType;

import java.time.Instant;

public record WalletTransactionSummaryDto(
        Long id,
        Long amount,
        TransactionType type,
        TransactionStatus status,
        String referenceId,
        String providerOrderId,
        Long orderId,
        String description,
        Long balanceAfter,
        Instant createdAt
) {
}

