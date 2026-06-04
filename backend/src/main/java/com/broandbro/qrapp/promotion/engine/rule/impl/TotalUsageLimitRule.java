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
public class TotalUsageLimitRule implements PromotionRule {

    private final PromotionUsageRepository usageRepository;

    @Override
    public boolean supports(RuleType ruleType) {
        return ruleType == RuleType.TOTAL_USAGE_LIMIT;
    }

    @Override
    public RuleResult evaluate(EligibilityContext ctx, Promotion promotion, String paramsJson) {
        if (promotion.getTotalUsageLimit() == null) return RuleResult.pass();
        long used = usageRepository.countByPromotionId(promotion.getId());
        return used < promotion.getTotalUsageLimit()
                ? RuleResult.pass()
                : RuleResult.fail("This promotion has reached its usage limit");
    }
}

