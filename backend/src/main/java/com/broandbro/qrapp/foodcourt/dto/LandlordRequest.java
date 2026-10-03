package com.broandbro.qrapp.foodcourt.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Create/update payload for a landlord. */
public record LandlordRequest(

        @NotBlank(message = "name is required")
        @Size(max = 150)
        String name,

        @Size(max = 30) String contactPhone,
        @Email @Size(max = 150) String contactEmail,
        @Size(max = 255) String addressLine,
        String notes
) {}
