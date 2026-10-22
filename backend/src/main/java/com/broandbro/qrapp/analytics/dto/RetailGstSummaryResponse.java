package com.broandbro.qrapp.analytics.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * MRP (retail product) sales and GST for a date range.
 * {@code mrpSales} is the GST-inclusive amount customers paid for MRP products.
 */
public record RetailGstSummaryResponse(
        LocalDate from,
        LocalDate to,
        BigDecimal mrpSales,
        long mrpUnitsSold,
        BigDecimal mrpGst,
        BigDecimal totalGst,
        BigDecimal cgst,
        BigDecimal sgst,
        BigDecimal igst
) {}
