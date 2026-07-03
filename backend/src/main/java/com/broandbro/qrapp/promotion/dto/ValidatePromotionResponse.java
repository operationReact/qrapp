package com.broandbro.qrapp.promotion.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class ValidatePromotionResponse {
    private Long promotionId;
    private String code;
    private String title;
    private String rewardType;
    private String rewardDisplay;
    private BigDecimal actualDiscount;
    private BigDecimal finalSubtotal;
    private BigDecimal finalTotal;
    private String message;
}

