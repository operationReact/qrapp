package com.broandbro.qrapp.foodcourt.dto;

import java.util.UUID;

/** Landlord view. */
public record LandlordResponse(
        UUID id,
        UUID foodCourtId,
        String name,
        String contactPhone,
        String contactEmail,
        String addressLine,
        String notes
) {}
