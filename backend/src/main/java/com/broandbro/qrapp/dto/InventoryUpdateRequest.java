package com.broandbro.qrapp.dto;

import com.broandbro.qrapp.enums.InventoryOperation;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import com.broandbro.qrapp.enums.InventoryAuditActionType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO for admin inventory update operations.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InventoryUpdateRequest {

    /**
     * Menu item ID to update.
     */
    @NotNull(message = "Menu item ID is required")
    private Long menuItemId;

    /**
     * Operation type: ADD, REMOVE, SET
     */
    @NotNull(message = "Operation is required")
    private InventoryOperation operation;

    /**
     * Quantity to add/remove/set.
     */
    @NotNull(message = "Quantity is required")
    @Positive(message = "Quantity must be positive")
    private Long quantity;

    /**
     * Reason for this inventory change.
     * Used for audit trail.
     * Example: "Morning stock refill", "Damaged inventory"
     */
    private String reason;

    /**
     * Reference ID for tracking.
     * Example: warehouse ID, order ID, etc.
     */
    private String referenceId;

    /** Optional accountable movement label; defaults to the operation's legacy action. */
    private InventoryAuditActionType movementType;
}
