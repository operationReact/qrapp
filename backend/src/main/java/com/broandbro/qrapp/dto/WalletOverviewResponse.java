package com.broandbro.qrapp.dto;

import java.time.Instant;
import java.math.BigDecimal;

public record WalletOverviewResponse(
        BigDecimal balance,
        BigDecimal totalCredited,
        BigDecimal totalDebited,
        BigDecimal pendingAmount,
        long successfulCreditsCount,
        long successfulDebitsCount,
        Instant lastTransactionAt
) {
}
