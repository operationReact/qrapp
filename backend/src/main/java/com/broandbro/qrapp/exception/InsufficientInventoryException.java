package com.broandbro.qrapp.exception;

/**
 * Thrown when ordered quantity exceeds available inventory.
 */
public class InsufficientInventoryException extends RuntimeException {
    private final Long menuItemId;
    private final Long requestedQuantity;
    private final Long availableQuantity;

    public InsufficientInventoryException(Long menuItemId, Long requestedQuantity, Long availableQuantity) {
        super(String.format("Insufficient inventory for item %d. Requested: %d, Available: %d",
            menuItemId, requestedQuantity, availableQuantity));
        this.menuItemId = menuItemId;
        this.requestedQuantity = requestedQuantity;
        this.availableQuantity = availableQuantity;
    }

    public Long getMenuItemId() {
        return menuItemId;
    }

    public Long getRequestedQuantity() {
        return requestedQuantity;
    }

    public Long getAvailableQuantity() {
        return availableQuantity;
    }
}

