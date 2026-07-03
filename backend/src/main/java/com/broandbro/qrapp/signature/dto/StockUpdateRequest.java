package com.broandbro.qrapp.signature.dto;

import com.broandbro.qrapp.enums.SignatureInventoryOperation;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotBlank;

public record StockUpdateRequest(
        @NotNull
        SignatureInventoryOperation operation,

        @NotNull
        int quantity,   // positive = add, negative = deduct (for ADJUSTMENT/DAMAGED)

        String remarks
) {}

