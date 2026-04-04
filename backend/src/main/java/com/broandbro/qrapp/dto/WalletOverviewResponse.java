package com.broandbro.qrapp.dto;

import java.time.Instant;

public record WalletOverviewResponse(
        Long balance,
        Long totalCredited,
        Long totalDebited,
        Long pendingAmount,
        long successfulCreditsCount,
        long successfulDebitsCount,
        Instant lastTransactionAt
) {
}

