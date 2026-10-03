package com.broandbro.qrapp.foodcourt.dto;

import java.util.List;

/**
 * Outcome of a rent-generation run: the invoices created this run plus the
 * count of leases skipped because an invoice already existed for the period
 * (preserving duplicate-month uniqueness).
 */
public record RentGenerationResultResponse(
        Integer year,
        Integer month,
        int generatedCount,
        int skippedExistingCount,
        List<RentInvoiceResponse> generated
) {}
