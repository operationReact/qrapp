package com.broandbro.qrapp.promotion.engine.rule.impl;

import com.broandbro.qrapp.promotion.engine.EligibilityContext;
import com.broandbro.qrapp.promotion.engine.rule.PromotionRule;
import com.broandbro.qrapp.promotion.engine.rule.RuleResult;
import com.broandbro.qrapp.promotion.entity.Promotion;
import com.broandbro.qrapp.promotion.enums.RuleType;
import org.springframework.stereotype.Component;

@Component
public class ActiveStatusRule implements PromotionRule {

    @Override
    public boolean supports(RuleType ruleType) {
        return ruleType == RuleType.ACTIVE_STATUS;
    }

    @Override
    public RuleResult evaluate(EligibilityContext ctx, Promotion promotion, String paramsJson) {
        return Boolean.TRUE.equals(promotion.getIsActive())
                ? RuleResult.pass()
                : RuleResult.fail("This promotion is no longer active");
    }
}

