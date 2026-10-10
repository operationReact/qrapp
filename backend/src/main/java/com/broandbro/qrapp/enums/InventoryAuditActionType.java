package com.broandbro.qrapp.enums;

/**
 * Types of inventory audit actions for tracking changes.
 */
public enum InventoryAuditActionType {
    /**
     * Manual admin update to inventory
     */
    MANUAL_UPDATE,

    /**
     * Deduction from inventory when order is placed
     */
    ORDER_DEDUCTION,

    /**
     * Restoration of inventory when order is cancelled
     */
    ORDER_CANCEL_RESTORE,

    /**
     * Automatic marking as out of stock when quantity reaches zero
     */
    AUTO_OUT_OF_STOCK,

    /**
     * Automatic marking as back in stock when quantity exceeds zero
     */
    AUTO_BACK_IN_STOCK,

    /**
     * Bulk inventory import or sync
     */
    BULK_UPDATE,

    /**
     * Admin manually set item orderable status
     */
    MANUAL_ORDERABLE_OVERRIDE,

    /**
     * Low stock threshold reached
     */
    LOW_STOCK_ALERT,

    /**
     * Admin explicitly set quantity to a fixed value via admin screen
     */
    SET_QUANTITY,

    /**
     * Admin changed isItemInStock flag (manual override)
     */
    STOCK_STATUS_CHANGE,

    /**
     * Admin changed isHidden flag
     */
    VISIBILITY_CHANGE
    ,
    OPENING_STOCK,
    PURCHASE,
    SALE,
    RETURN,
    DAMAGE,
    WASTAGE,
    ADJUSTMENT
}
