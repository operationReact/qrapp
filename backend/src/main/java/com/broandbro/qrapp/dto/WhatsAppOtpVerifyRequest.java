package com.broandbro.qrapp.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class WhatsAppOtpVerifyRequest {
    @NotBlank
    private String phoneNumber;
    @NotBlank
    @Pattern(regexp = "\\d{6}", message = "otp must contain 6 digits")
    private String otp;
}
