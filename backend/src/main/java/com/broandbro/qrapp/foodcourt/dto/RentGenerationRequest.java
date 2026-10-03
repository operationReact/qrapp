package com.broandbro.qrapp.foodcourt.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.UUID;

/**
 * Request to generate monthly rent invoices for a billing period. When
 * {@code stallLeaseIds} is null/empty, invoices are generated for every active
 * stall lease in the food court. Existing (lease, period) invoices are skipped,
 * never duplicated.
 */
public record RentGenerationRequest(

        @NotNull(message = "year is required")
        @Min(2000) @Max(2100)
        Integer year,

        @NotNull(message = "month is required")
        @Min(1) @Max(12)
        Integer month,

        List<UUID> stallLeaseIds
) {}
