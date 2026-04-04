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
        Instant createdAt
) {
}

