package com.broandbro.qrapp.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateRazorpayOrderRequest {
    @NotNull
    private Long amount; // in rupees; the minimum is enforced by WalletService
}

