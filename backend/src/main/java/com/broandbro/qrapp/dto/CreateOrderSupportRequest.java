package com.broandbro.qrapp.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateOrderSupportRequest {
    @NotBlank
    @Size(min = 10, max = 1000)
    private String message;
}
