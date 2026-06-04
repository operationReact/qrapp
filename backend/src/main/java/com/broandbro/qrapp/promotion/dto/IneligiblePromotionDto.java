package com.broandbro.qrapp.promotion.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class IneligiblePromotionDto {
    private Long id;
    private String code;
    private String title;
    private String rewardDisplay;
    private String failureReason;
    private BigDecimal missingAmount;   // non-null for "add ₹X more" cases
}

