package com.broandbro.qrapp.foodcourt.dto;

import com.broandbro.qrapp.foodcourt.enums.TenantStatus;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Create/update payload for a tenant. */
public record TenantRequest(

        @NotBlank(message = "name is required")
        @Size(max = 150)
        String name,

        @Size(max = 180) String businessName,
        @Size(max = 30) String contactPhone,
        @Email @Size(max = 150) String contactEmail,
        @Size(max = 100) String userId,
        TenantStatus status,
        String notes
) {}
