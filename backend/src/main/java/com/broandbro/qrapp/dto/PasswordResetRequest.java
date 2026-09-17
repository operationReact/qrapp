package com.broandbro.qrapp.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class PasswordResetRequest {
    @NotBlank
    private String phoneNumber;
    @NotBlank
    private String resetAuthorization;
    @NotBlank
    private String newPassword;
}
