package com.broandbro.qrapp.combo.dto;

import jakarta.validation.constraints.*;

public record ComboSignatureProductRequest(
        @NotNull(message = "Signature product ID is required")
        Long signatureProductId,

        @Min(value = 1, message = "Quantity must be at least 1")
        int quantity
) {}

