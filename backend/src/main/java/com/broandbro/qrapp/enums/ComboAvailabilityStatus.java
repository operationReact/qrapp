package com.broandbro.qrapp.enums;

public enum ComboAvailabilityStatus {
    AVAILABLE,
    UNAVAILABLE,
    ITEMS_UNAVAILABLE,   // One or more combo items are out of stock / hidden
    SCHEDULE_INACTIVE,   // Outside scheduled serving window
    PREORDER_CLOSED      // Pre-order cutoff passed
}

