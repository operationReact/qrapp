package com.broandbro.qrapp.foodcourt.dto;

import com.broandbro.qrapp.foodcourt.enums.StallStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/** Create/update payload for a stall. */
public record StallRequest(

        @NotBlank(message = "code is required")
        @Size(max = 40)
        String code,

        @Size(max = 120) String name,
        @Size(max = 40) String floor,
        BigDecimal areaSqft,
        BigDecimal baseRent,
        StallStatus status,
        String notes
) {}
