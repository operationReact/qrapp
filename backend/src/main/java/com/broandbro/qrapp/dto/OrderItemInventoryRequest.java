package com.broandbro.qrapp.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO for order item validation during checkout.
 *
 * Used by order service to validate inventory before placing order.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderItemInventoryRequest {

    /**
     * Menu item ID
     */
    @NotNull(message = "Menu item ID is required")
    private Long menuItemId;

    /**
     * Quantity being ordered
     */
    @NotNull(message = "Quantity is required")
    @Positive(message = "Quantity must be greater than zero")
    private Long quantity;
}

