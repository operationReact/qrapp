package com.broandbro.qrapp.manualinvoice.enums;

/** Lifecycle of a manual invoice. DRAFT is editable, FINALIZED is immutable, CANCELLED carries a reason. */
public enum ManualInvoiceStatus {
    DRAFT,
    FINALIZED,
    CANCELLED
}
