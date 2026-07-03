package com.broandbro.qrapp.dto.partyorder;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;

/**
 * Represents a single menu item row in an estimate submission.
 * Admin provides the item name, quoted price (customer sees), and estimated cost (internal).
 */
public record PartyOrderMenuItemEstimate(

        @NotBlank(message = "Item name is required")
        @Size(max = 255)
        String itemName,

        String notes,

        @NotNull(message = "Quoted price is required")
        @DecimalMin(value = "0.0", inclusive = false, message = "Quoted price must be positive")
        BigDecimal quotedPrice,

        @NotNull(message = "Estimated cost is required")
        @DecimalMin(value = "0.0", message = "Estimated cost must be non-negative")
        BigDecimal estimatedCost
) {}

