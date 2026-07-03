package com.broandbro.qrapp.promotion.engine.rule;

import com.broandbro.qrapp.promotion.engine.EligibilityContext;
import com.broandbro.qrapp.promotion.entity.Promotion;
import com.broandbro.qrapp.promotion.enums.RuleType;

public interface PromotionRule {
    boolean supports(RuleType ruleType);
    RuleResult evaluate(EligibilityContext ctx, Promotion promotion, String paramsJson);
}

