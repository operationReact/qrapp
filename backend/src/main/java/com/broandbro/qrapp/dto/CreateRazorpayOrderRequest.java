package com.broandbro.qrapp.dto;

import lombok.Data;

@Data
public class CreateRazorpayOrderRequest {
    private Long amount; // in smallest unit (paise)
}

