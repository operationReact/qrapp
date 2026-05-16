package com.broandbro.qrapp.exception;

/**
 * Thrown when attempting inventory operations on items without proper inventory configuration.
 */
public class InventoryNotConfiguredException extends RuntimeException {
    private final Long menuItemId;

    public InventoryNotConfiguredException(Long menuItemId) {
        super(String.format("Inventory not configured for menu item %d", menuItemId));
        this.menuItemId = menuItemId;
    }

    public InventoryNotConfiguredException(String message) {
        super(message);
        this.menuItemId = null;
    }

    public Long getMenuItemId() {
        return menuItemId;
    }
}

