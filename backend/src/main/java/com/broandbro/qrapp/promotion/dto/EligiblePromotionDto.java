package com.broandbro.qrapp.promotion.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class EligiblePromotionDto {
    private Long id;
    private String code;
    private String title;
    private String description;
    private String rewardType;
    private String rewardDisplay;   // e.g. "20% off (up to ₹100)"
    private BigDecimal actualDiscount;
    private double score;
    private boolean autoSelected;
    private LocalDateTime expiresAt;
}

