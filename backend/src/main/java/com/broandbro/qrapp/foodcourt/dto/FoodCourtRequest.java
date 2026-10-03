package com.broandbro.qrapp.foodcourt.dto;

import com.broandbro.qrapp.foodcourt.enums.FoodCourtStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Create/update payload for a food court. */
public record FoodCourtRequest(

        @NotBlank(message = "code is required")
        @Size(max = 60)
        String code,

        @NotBlank(message = "name is required")
        @Size(max = 150)
        String name,

        @Size(max = 255) String addressLine,
        @Size(max = 100) String city,
        @Size(max = 100) String state,
        @Size(max = 20) String postalCode,
        @Size(max = 30) String contactPhone,
        Integer totalStalls,
        FoodCourtStatus status,
        String notes
) {}
