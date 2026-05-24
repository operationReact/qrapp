package com.broandbro.qrapp.enums;

public enum PartyOrderStatus {
    /** Initial state — waiting for admin to provide an estimate. */
    PENDING_ESTIMATE,

    /** Admin has submitted an estimate; user has not yet responded. */
    ESTIMATE_SENT,

    /** User confirmed the estimate — order is locked in. */
    CONFIRMED,

    /** User rejected the estimate. */
    REJECTED,

    /** Cancelled by either side before confirmation. */
    CANCELLED,

    /** Event has been delivered; order closed out. */
    COMPLETED
}

