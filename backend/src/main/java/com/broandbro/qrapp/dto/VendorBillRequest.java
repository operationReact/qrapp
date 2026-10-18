package com.broandbro.qrapp.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record VendorBillRequest(
        String invoiceNumber,
        LocalDate invoiceDate,
        String notes,
        List<ItemRequest> items
) {
    public record ItemRequest(String description, BigDecimal quantity, String unit, BigDecimal unitPrice) {
    }
}
