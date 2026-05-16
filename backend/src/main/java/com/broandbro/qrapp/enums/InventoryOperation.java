package com.broandbro.qrapp.enums;

/**
 * Inventory update operations for admin management.
 */
public enum InventoryOperation {
    /**
     * Add quantity to existing inventory
     */
    ADD,

    /**
     * Remove quantity from existing inventory
     */
    REMOVE,

    /**
     * Set inventory to exact quantity (replaces current)
     */
    SET
}

