package com.broandbro.qrapp.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class AdminPasswordResetRequest {
    @NotBlank
    @Size(min = 8, max = 128)
    private String newPassword;
}
