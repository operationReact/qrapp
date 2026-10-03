package com.broandbro.qrapp.foodcourt.dto;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Aggregated snapshot of a food court's current operational and financial
 * health, computed on demand from live data.
 */
public record FoodCourtDashboardResponse(
        UUID foodCourtId,
        String foodCourtName,
        long totalStalls,
        long occupiedStalls,
        long vacantStalls,
        BigDecimal occupancyRatePercent,
        long activeLeases,
        long activeTenants,
        BigDecimal monthlyContractedRent,
        BigDecimal depositsHeld,
        BigDecimal outstandingRent,
        long openActionItems,
        int currentPeriodYear,
        int currentPeriodMonth,
        BigDecimal currentPeriodBilled,
        BigDecimal currentPeriodCollected,
        BigDecimal monthlyLandlordLease,
        BigDecimal grossRentSpread,
        BigDecimal foodCourtExpenses,
        BigDecimal netContribution,
        long overdueRents
) {}
