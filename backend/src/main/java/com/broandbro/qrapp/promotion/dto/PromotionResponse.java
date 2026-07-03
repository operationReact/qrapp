package com.broandbro.qrapp.promotion.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class PromotionResponse {
    private Long id;
    private String code;
    private String title;
    private String description;
    private String promoType;
    private String stackMode;
    private Boolean isActive;
    private Boolean isFirstOrderOnly;
    private LocalDateTime startsAt;
    private LocalDateTime expiresAt;
    private Integer totalUsageLimit;
    private Integer perUserLimit;
    private Long totalUsed;
    private String rewardType;
    private String rewardDisplay;
    private BigDecimal rewardValue;
    private BigDecimal rewardMaxCap;
    private List<ScopeInfo> scopes;
    private LocalDateTime createdAt;

    @Data
    @Builder
    public static class ScopeInfo {
        private String scopeType;
        private Long scopeId;
    }
}

