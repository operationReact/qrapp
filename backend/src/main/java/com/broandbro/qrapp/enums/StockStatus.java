package com.broandbro.qrapp.enums;

/**
 * Stock status for display to customers.
 * Does not expose exact quantities.
 */
public enum StockStatus {
    /**
     * Item is available with sufficient stock
     */
    AVAILABLE,

    /**
     * Item is available but stock is low (at or below threshold)
     */
    LIMITED,

    /**
     * Item is out of stock
     */
    OUT_OF_STOCK,

    /**
     * Item is unlimited (no inventory tracking)
     */
    UNLIMITED
}

