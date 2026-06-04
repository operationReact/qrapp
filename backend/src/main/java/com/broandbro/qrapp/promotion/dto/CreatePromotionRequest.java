package com.broandbro.qrapp.promotion.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/** Admin create/update request */
@Data
public class CreatePromotionRequest {
    private String code;                    // null for AUTOMATIC_DISCOUNT
    private String title;
    private String description;
    private String promoType;               // COUPON_CODE | AUTOMATIC_DISCOUNT
    private String stackMode;               // NONE | DELIVERY_ONLY | MULTIPLE_ALLOWED
    private LocalDateTime startsAt;
    private LocalDateTime expiresAt;
    private Integer totalUsageLimit;
    private Integer perUserLimit;
    private Boolean isFirstOrderOnly;

    private List<RuleRequest> rules;
    private List<ScopeRequest> scopes;
    private RewardRequest reward;

    @Data
    public static class RuleRequest {
        private String ruleType;    // MIN_ORDER_AMOUNT | PER_USER_LIMIT | TOTAL_USAGE_LIMIT
        private String params;      // JSON string, e.g. {"minAmount": 299}
    }

    @Data
    public static class ScopeRequest {
        private String scopeType;   // RESTAURANT | CATEGORY | MENU_ITEM
        private Long scopeId;
    }

    @Data
    public static class RewardRequest {
        private String rewardType;  // PERCENTAGE_DISCOUNT | FLAT_DISCOUNT | FREE_DELIVERY
        private BigDecimal value;
        private BigDecimal maxCap;
    }
}

