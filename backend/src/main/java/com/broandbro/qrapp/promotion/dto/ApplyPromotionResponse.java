package com.broandbro.qrapp.promotion.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class ApplyPromotionResponse {
    private String promotionCode;
    private BigDecimal discountApplied;
    private BigDecimal originalSubtotal;
    private BigDecimal finalTotal;
    private String message;
}

