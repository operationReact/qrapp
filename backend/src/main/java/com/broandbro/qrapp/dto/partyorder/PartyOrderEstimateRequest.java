package com.broandbro.qrapp.dto.partyorder;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.util.List;

public record PartyOrderEstimateRequest(

        /** Per-item breakdown (new approach). If provided, totals are auto-calculated. */
        @Valid
        List<PartyOrderMenuItemEstimate> menuItems,

        /** Direct total amount — used only if menuItems is null/empty (backward compat). */
        @DecimalMin(value = "1.00", message = "Estimated amount must be greater than zero")
        BigDecimal estimatedAmount,

        @Size(max = 10)
        String currency,

        /** Note visible to the customer explaining the estimate. */
        @Size(max = 2000, message = "Note must not exceed 2000 characters")
        String estimateNote,

        /** Internal admin-only notes. Never exposed to users. */
        @Size(max = 5000)
        String adminNotes,

        /** Estimate expiry hours (default 48). */
        Integer estimateExpiryHours
) {}
