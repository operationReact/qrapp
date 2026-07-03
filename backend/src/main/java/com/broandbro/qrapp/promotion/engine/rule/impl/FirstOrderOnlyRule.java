package com.broandbro.qrapp.promotion.engine.rule.impl;

import com.broandbro.qrapp.promotion.engine.EligibilityContext;
import com.broandbro.qrapp.promotion.engine.rule.PromotionRule;
import com.broandbro.qrapp.promotion.engine.rule.RuleResult;
import com.broandbro.qrapp.promotion.entity.Promotion;
import com.broandbro.qrapp.promotion.enums.RuleType;
import org.springframework.stereotype.Component;

@Component
public class FirstOrderOnlyRule implements PromotionRule {

    @Override
    public boolean supports(RuleType ruleType) {
        return ruleType == RuleType.FIRST_ORDER_ONLY;
    }

    @Override
    public RuleResult evaluate(EligibilityContext ctx, Promotion promotion, String paramsJson) {
        if (!Boolean.TRUE.equals(promotion.getIsFirstOrderOnly())) {
            return RuleResult.pass();
        }
        return ctx.user().orderCount() == 0
                ? RuleResult.pass()
                : RuleResult.fail("This offer is for first-time orders only");
    }
}

