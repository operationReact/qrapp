package com.broandbro.qrapp.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateRazorpayOrderRequest {
    @NotNull
    @Min(100)
    private Long amount; // in smallest unit (paise)
}

