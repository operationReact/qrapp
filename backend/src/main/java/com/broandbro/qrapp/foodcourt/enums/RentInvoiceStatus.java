package com.broandbro.qrapp.foodcourt.enums;

/** Status of a generated monthly rent invoice. */
public enum RentInvoiceStatus {
    PENDING,
    DUE_SOON,
    PARTIALLY_PAID,
    PAID,
    OVERDUE,
    WAIVED,
    CANCELLED
}
