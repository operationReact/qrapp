package com.broandbro.qrapp.foodcourt.dto;

import com.broandbro.qrapp.foodcourt.enums.FoodCourtStatus;

import java.time.Instant;
import java.util.UUID;

/** Summary view of a food court for list/detail responses. */
public record FoodCourtResponse(
        UUID id,
        String code,
        String name,
        String addressLine,
        String city,
        String state,
        String postalCode,
        String contactPhone,
        Integer totalStalls,
        long stallCount,
        long occupiedStalls,
        FoodCourtStatus status,
        String notes,
        Instant createdAt,
        Instant updatedAt
) {}
