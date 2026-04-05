package com.broandbro.qrapp.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class CreateRazorpayOrderResponse {
    private String razorpayOrderId;
    private String keyId;
    private Long amount;
    private String currency;
}

