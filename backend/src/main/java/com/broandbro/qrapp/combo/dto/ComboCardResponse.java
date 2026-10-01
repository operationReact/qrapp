package com.broandbro.qrapp.combo.dto;

/** Mobile-compact combo card — used in listing APIs. */
public record ComboCardResponse(
        Long id,
        String comboName,
        java.math.BigDecimal comboPrice,
        java.math.BigDecimal originalPrice,
        java.math.BigDecimal savingsPercentage,
        boolean isFeatured,
        boolean isPreorderEligible,
        com.broandbro.qrapp.enums.ComboAvailabilityStatus availabilityStatus,
        com.broandbro.qrapp.enums.ComboType comboType,
        String thumbnailUrl,
        com.broandbro.qrapp.enums.TimeSlot timeSlot,
        java.util.List<String> itemNames,  // compact: just display names
        Long locationId  // combo's owning location, derived from its menu items
) {}

