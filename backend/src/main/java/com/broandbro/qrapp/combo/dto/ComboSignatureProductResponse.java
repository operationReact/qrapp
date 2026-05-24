package com.broandbro.qrapp.combo.dto;

import java.math.BigDecimal;

public record ComboSignatureProductResponse(
        Long id,
        Long signatureProductId,
        String productName,
        BigDecimal sellingPrice,
        String imageUrl,
        int quantity
) {}

