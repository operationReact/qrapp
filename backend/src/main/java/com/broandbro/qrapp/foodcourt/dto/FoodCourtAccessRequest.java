package com.broandbro.qrapp.foodcourt.dto;

import com.broandbro.qrapp.foodcourt.enums.FoodCourtRole;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Grant/update payload for per-food-court access. */
public record FoodCourtAccessRequest(

        @NotBlank(message = "userId is required")
        @Size(max = 100)
        String userId,

        @NotNull(message = "role is required")
        FoodCourtRole role
) {}
