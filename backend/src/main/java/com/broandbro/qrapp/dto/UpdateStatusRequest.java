package com.broandbro.qrapp.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateStatusRequest {
    @NotBlank
    private String status;

    /** Optional: reason for status change, especially for backward transitions */
    @Size(max = 255)
    private String reason;
}

