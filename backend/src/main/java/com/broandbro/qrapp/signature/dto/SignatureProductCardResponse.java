package com.broandbro.qrapp.signature.dto;

/** Mobile-compact product card. */
public record SignatureProductCardResponse(
        Long id,
        String name,
        java.math.BigDecimal price,
        int stock,
        boolean isFeatured,
        boolean isComboAttachable,
        String availabilityStatus,   // IN_STOCK | LOW_STOCK | OUT_OF_STOCK
        String thumbnailUrl
) {}

