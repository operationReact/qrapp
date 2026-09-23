package com.broandbro.qrapp.signature.dto;

import com.broandbro.qrapp.enums.SignatureProductCategory;

import java.math.BigDecimal;
import java.time.Instant;

/** Full product response — admin views. */
public record SignatureProductResponse(
        Long id,
        Long locationId,
        String productName,
        String shortName,
        String description,
        SignatureProductCategory category,
        String imageUrl,
        BigDecimal sellingPrice,
        BigDecimal procurementPrice,
        int stockQuantity,
        int minimumStockThreshold,
        boolean isActive,
        boolean isFeatured,
        boolean isComboAttachable,
        int displayPriority,
        String vendorName,
        String vendorContact,
        String availabilityStatus,   // IN_STOCK | LOW_STOCK | OUT_OF_STOCK
        Instant createdAt,
        Instant updatedAt
) {}

