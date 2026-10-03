package com.broandbro.qrapp.foodcourt.dto;

import com.broandbro.qrapp.foodcourt.enums.FoodCourtAccessStatus;
import com.broandbro.qrapp.foodcourt.enums.FoodCourtRole;

import java.time.Instant;
import java.util.UUID;

/** Per-food-court access grant view. */
public record FoodCourtAccessResponse(
        UUID id,
        UUID foodCourtId,
        String userId,
        FoodCourtRole role,
        FoodCourtAccessStatus status,
        Instant createdAt
) {}
