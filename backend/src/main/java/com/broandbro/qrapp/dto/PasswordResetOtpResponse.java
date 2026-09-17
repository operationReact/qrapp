package com.broandbro.qrapp.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class PasswordResetOtpResponse {
    private boolean success;
    private String message;
    private String resetAuthorization;
}
