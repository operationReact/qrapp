package com.broandbro.qrapp.foodcourt.dto;

import com.broandbro.qrapp.foodcourt.enums.TenantStatus;

import java.util.UUID;

/** Tenant view. */
public record TenantResponse(
        UUID id,
        UUID foodCourtId,
        String name,
        String businessName,
        String contactPhone,
        String contactEmail,
        String userId,
        TenantStatus status,
        String notes
) {}
