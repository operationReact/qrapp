package com.broandbro.qrapp.foodcourt.dto;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Financial report for a food court over a period: rent billed/collected,
 * outstanding balance, expenses and resulting net position.
 */
public record FoodCourtFinancialReportResponse(
        UUID foodCourtId,
        String foodCourtName,
        Integer year,
        Integer month,
        BigDecimal rentBilled,
        BigDecimal rentCollected,
        BigDecimal rentOutstanding,
        BigDecimal expenses,
        BigDecimal depositsHeld,
        BigDecimal netPosition
) {}
