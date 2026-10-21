package com.broandbro.qrapp.recommendation.dto;

import java.math.BigDecimal;

public final class RecommendationRuleDtos {

    private RecommendationRuleDtos() {}

    public record RecommendationRuleRequest(
            String name,
            String triggerType,
            Long triggerItemId,
            Long triggerCategoryId,
            BigDecimal minCartValue,
            Long targetItemId,
            Long targetCategoryId,
            String rewardType,
            BigDecimal rewardValue,
            Integer priority,
            Boolean isActive,
            String mealRole) {}

    public record RecommendationRuleResponse(
            Long id,
            String name,
            String triggerType,
            Long triggerItemId,
            String triggerItemName,
            Long triggerCategoryId,
            String triggerCategoryName,
            BigDecimal minCartValue,
            Long targetItemId,
            String targetItemName,
            Long targetCategoryId,
            String targetCategoryName,
            String rewardType,
            BigDecimal rewardValue,
            Integer priority,
            Boolean isActive,
            String mealRole) {}
}
