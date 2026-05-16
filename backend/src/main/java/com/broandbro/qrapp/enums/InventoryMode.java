package com.broandbro.qrapp.enums;

/**
 * Inventory mode determines how stock is managed for a menu item.
 */
public enum InventoryMode {
    /**
     * Item has unlimited stock, no inventory tracking needed
     */
    UNLIMITED,

    /**
     * Item has limited stock, inventory must be tracked and enforced
     */
    LIMITED
}

