package com.broandbro.qrapp.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ManualRefundCompleteRequest(
        @NotBlank @Size(max = 120) String reference
) {
}
