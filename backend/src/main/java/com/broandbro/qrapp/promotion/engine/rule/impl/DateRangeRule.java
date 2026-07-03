package com.broandbro.qrapp.promotion.engine.rule.impl;

import com.broandbro.qrapp.promotion.engine.EligibilityContext;
import com.broandbro.qrapp.promotion.engine.rule.PromotionRule;
import com.broandbro.qrapp.promotion.engine.rule.RuleResult;
import com.broandbro.qrapp.promotion.entity.Promotion;
import com.broandbro.qrapp.promotion.enums.RuleType;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
public class DateRangeRule implements PromotionRule {

    @Override
    public boolean supports(RuleType ruleType) {
        return ruleType == RuleType.DATE_RANGE;
    }

    @Override
    public RuleResult evaluate(EligibilityContext ctx, Promotion promotion, String paramsJson) {
        LocalDateTime now = ctx.evaluatedAt();
        if (promotion.getStartsAt() != null && now.isBefore(promotion.getStartsAt())) {
            return RuleResult.fail("This promotion is not yet active");
        }
        if (promotion.getExpiresAt() != null && now.isAfter(promotion.getExpiresAt())) {
            return RuleResult.fail("This promotion has expired");
        }
        return RuleResult.pass();
    }
}

