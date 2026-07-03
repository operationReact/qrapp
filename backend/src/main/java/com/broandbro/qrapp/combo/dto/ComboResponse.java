package com.broandbro.qrapp.combo.dto;

import com.broandbro.qrapp.enums.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/** Full combo response — used for GET /admin/combos/{id} and create/update responses. */
public record ComboResponse(
        Long id,
        String comboName,
        String shortName,
        String description,
        Long categoryId,
        String categoryName,
        ComboType comboType,
        BigDecimal originalPrice,
        BigDecimal comboPrice,
        BigDecimal savingsAmount,
        BigDecimal savingsPercentage,
        String imageUrl,
        boolean isFeatured,
        boolean isPreorderEligible,
        boolean isSignatureCombo,
        boolean isActive,
        ComboStatus status,
        TimeSlot timeSlot,
        ComboAvailabilityStatus availabilityStatus,
        int displayPriority,
        String createdBy,
        String updatedBy,
        Instant createdAt,
        Instant updatedAt,
        List<ComboItemResponse> items,
        List<ComboScheduleResponse> schedules,
        List<ComboSignatureProductResponse> signatureProducts
) {}

