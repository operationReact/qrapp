package com.broandbro.qrapp.combo.dto;

import jakarta.validation.constraints.*;

public record ComboItemRequest(
        @NotNull(message = "Menu item ID is required")
        Long menuItemId,

        @Min(value = 1, message = "Quantity must be at least 1")
        int quantity,

        @Min(0)
        int sortOrder
) {}

