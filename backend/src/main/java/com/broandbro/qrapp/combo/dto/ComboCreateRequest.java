package com.broandbro.qrapp.combo.dto;

import com.broandbro.qrapp.enums.ComboType;
import com.broandbro.qrapp.enums.TimeSlot;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.util.List;

/**
 * Request payload for creating or replacing a combo.
 */
public record ComboCreateRequest(

        @NotBlank(message = "Combo name is required")
        @Size(max = 150)
        String comboName,

        @NotBlank(message = "Short name is required")
        @Size(max = 60)
        String shortName,

        String description,

        Long categoryId,

        @NotNull(message = "Combo type is required")
        ComboType comboType,

        @NotNull(message = "Combo price is required")
        @DecimalMin(value = "0.01", message = "Combo price must be positive")
        BigDecimal comboPrice,

        String imageUrl,

        @NotNull(message = "Time slot is required")
        TimeSlot timeSlot,

        boolean isFeatured,
        boolean isPreorderEligible,
        boolean isSignatureCombo,

        @Min(value = 0, message = "Display priority must be >= 0")
        int displayPriority,

        @Valid
        @NotNull(message = "Items are required")
        @Size(min = 2, message = "A combo must contain at least 2 items")
        List<ComboItemRequest> items,

        @Valid
        List<ComboScheduleRequest> schedules,

        @Valid
        List<ComboSignatureProductRequest> signatureProducts
) {}

