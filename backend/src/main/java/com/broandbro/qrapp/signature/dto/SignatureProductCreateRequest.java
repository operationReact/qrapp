package com.broandbro.qrapp.signature.dto;

import com.broandbro.qrapp.enums.SignatureProductCategory;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;

public record SignatureProductCreateRequest(

        @NotNull
        Long locationId,

        @NotBlank @Size(max = 150)
        String productName,

        @NotBlank @Size(max = 60)
        String shortName,

        String description,

        @NotNull
        SignatureProductCategory category,

        String imageUrl,

        @NotNull @DecimalMin("0.01")
        BigDecimal sellingPrice,

        BigDecimal procurementPrice,

        @Min(0)
        int stockQuantity,

        @Min(0)
        int minimumStockThreshold,

        boolean isFeatured,
        boolean isComboAttachable,

        @Min(0)
        int displayPriority,

        @Size(max = 150)
        String vendorName,

        @Size(max = 50)
        String vendorContact
) {}

