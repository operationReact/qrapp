package com.broandbro.qrapp.dto;

import jakarta.validation.constraints.Min;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Unified admin update request for a single menu item's inventory state.
 *
 * All fields are optional. Only non-null fields are applied.
 *
 * Stock availability is fully derived — there is no manual isItemInStock flag:
 *   UNLIMITED → always orderable (unless hidden)
 *   LIMITED   → orderable when quantity > 0
 *
 * To pause an item temporarily (kitchen issue, ingredient shortage) → set isHidden = true.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdminInventoryUpdateRequest {

    /** Set exact available quantity. Must be >= 0 when present. */
    @Min(value = 0, message = "Quantity cannot be negative")
    private Long quantity;

    /** Update low-stock alert threshold. Must be >= 0 when present. */
    @Min(value = 0, message = "Low stock threshold cannot be negative")
    private Long lowStockThreshold;

    /** Show / hide item on the customer menu. */
    private Boolean isHidden;

    /** Audit reason. Recommended when changing quantity. */
    private String reason;
}
