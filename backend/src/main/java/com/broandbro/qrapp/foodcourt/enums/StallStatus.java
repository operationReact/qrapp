package com.broandbro.qrapp.foodcourt.enums;

/**
 * Physical status of a stall. Occupancy is <em>not</em> represented here — it
 * is derived at read time from the presence of an active stall lease.
 */
public enum StallStatus {
    AVAILABLE,
    OCCUPIED,
    RESERVED,
    MAINTENANCE,
    VACANT
}
