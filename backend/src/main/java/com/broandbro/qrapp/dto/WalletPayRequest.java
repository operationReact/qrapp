package com.broandbro.qrapp.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class WalletPayRequest {
    @NotNull
    @Min(1)
    private Long amount; // smallest unit

    private Long orderId;

    private String description;
}

