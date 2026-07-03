package com.broandbro.qrapp.promotion.engine.rule.impl;

import com.broandbro.qrapp.promotion.engine.EligibilityContext;
import com.broandbro.qrapp.promotion.engine.rule.PromotionRule;
import com.broandbro.qrapp.promotion.engine.rule.RuleResult;
import com.broandbro.qrapp.promotion.entity.Promotion;
import com.broandbro.qrapp.promotion.enums.RuleType;
import com.broandbro.qrapp.promotion.repository.PromotionUsageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class PerUserLimitRule implements PromotionRule {

    private final PromotionUsageRepository usageRepository;

    @Override
    public boolean supports(RuleType ruleType) {
        return ruleType == RuleType.PER_USER_LIMIT;
    }

    @Override
    public RuleResult evaluate(EligibilityContext ctx, Promotion promotion, String paramsJson) {
        if (promotion.getPerUserLimit() == null) return RuleResult.pass();
        long used = usageRepository.countByPromotionIdAndUserId(promotion.getId(), ctx.user().id());
        return used < promotion.getPerUserLimit()
                ? RuleResult.pass()
                : RuleResult.fail("You've already used this promotion the maximum number of times");
    }
}

