package com.broandbro.qrapp.enums;

public enum PartyOrderStatus {
    /** Freshly submitted — no admin action yet. */
    NEW,

    /** Admin is reviewing the request before sending an estimate. */
    UNDER_REVIEW,

    /** Initial state (legacy) — waiting for admin to provide an estimate. */
    PENDING_ESTIMATE,

    /** Admin has submitted an estimate; user has not yet responded. */
    ESTIMATE_SENT,

    /** Estimate expired before user accepted. */
    ESTIMATE_EXPIRED,

    /** User accepted the estimate; waiting for advance payment. */
    ADVANCE_PENDING,

    /** User confirmed the estimate — order is locked in. */
    CONFIRMED,

    /** User rejected the estimate. */
    REJECTED,

    /** Cancelled by either side before confirmation. */
    CANCELLED,

    /** Event has been delivered by the team; waiting for user to pay remaining balance. */
    DELIVERED,

    /** Full payment received; order closed out. */
    COMPLETED
}
