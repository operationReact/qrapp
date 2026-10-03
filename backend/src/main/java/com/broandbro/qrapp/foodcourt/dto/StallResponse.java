package com.broandbro.qrapp.foodcourt.dto;

import com.broandbro.qrapp.foodcourt.enums.StallStatus;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Stall view. {@code occupied} and {@code currentTenant*} are derived at read
 * time from the active stall lease, never stored on the stall itself.
 */
public record StallResponse(
        UUID id,
        UUID foodCourtId,
        String code,
        String name,
        String floor,
        BigDecimal areaSqft,
        BigDecimal baseRent,
        StallStatus status,
        boolean occupied,
        UUID currentLeaseId,
        UUID currentTenantId,
        String currentTenantName,
        BigDecimal currentMonthlyRent,
        String notes
) {}
