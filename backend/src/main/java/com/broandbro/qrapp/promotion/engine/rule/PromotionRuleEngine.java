package com.broandbro.qrapp.promotion.engine.rule;

import com.broandbro.qrapp.promotion.engine.EligibilityContext;
import com.broandbro.qrapp.promotion.engine.EligibilityResult;
import com.broandbro.qrapp.promotion.engine.scope.PromotionScopeFilter;
import com.broandbro.qrapp.promotion.engine.scope.ScopeResult;
import com.broandbro.qrapp.promotion.engine.reward.RewardEngine;
import com.broandbro.qrapp.promotion.entity.Promotion;
import com.broandbro.qrapp.promotion.entity.PromotionRuleEntity;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class PromotionRuleEngine {

    private final List<PromotionRule> rules;
    private final PromotionScopeFilter scopeFilter;
    private final RewardEngine rewardEngine;

    public EligibilityResult evaluate(EligibilityContext ctx, Promotion promotion) {

        // ── 1. Scope check ────────────────────────────────────────────────────
        ScopeResult scopeResult = scopeFilter.check(ctx.cart(), promotion.getScopes());
        if (!scopeResult.matches()) {
            return EligibilityResult.ineligible(promotion, scopeResult.reason());
        }

        // ── 2. Always-on checks (active status + date range) ─────────────────
        // These are not stored as promotion_rule rows — they are implicit.
        RuleResult activeResult = evaluateImplicit(ctx, promotion);
        if (!activeResult.passed()) {
            return EligibilityResult.ineligible(promotion, activeResult.failureReason(), activeResult.missingAmount());
        }

        // ── 3. Explicit promotion_rule rows ───────────────────────────────────
        for (PromotionRuleEntity ruleEntity : promotion.getRules()) {
            PromotionRule handler = rules.stream()
                    .filter(r -> r.supports(ruleEntity.getRuleType()))
                    .findFirst()
                    .orElse(null);

            if (handler == null) {
                log.warn("No handler for rule type: {}", ruleEntity.getRuleType());
                continue;
            }

            RuleResult result = handler.evaluate(ctx, promotion, ruleEntity.getParams());
            if (!result.passed()) {
                return EligibilityResult.ineligible(promotion, result.failureReason(), result.missingAmount());
            }
        }

        // ── 4. Compute reward ─────────────────────────────────────────────────
        if (promotion.getReward() == null) {
            return EligibilityResult.ineligible(promotion, "Promotion has no reward configured");
        }
        BigDecimal discount = rewardEngine.compute(promotion.getReward(), ctx.cart());
        return EligibilityResult.eligible(promotion, discount);
    }

    /** Implicit rules: active status + date range are always evaluated even without explicit rule rows */
    private RuleResult evaluateImplicit(EligibilityContext ctx, Promotion promotion) {
        if (!Boolean.TRUE.equals(promotion.getIsActive())) {
            return RuleResult.fail("This promotion is no longer active");
        }
        if (promotion.getStartsAt() != null && ctx.evaluatedAt().isBefore(promotion.getStartsAt())) {
            return RuleResult.fail("This promotion is not yet active");
        }
        if (promotion.getExpiresAt() != null && ctx.evaluatedAt().isAfter(promotion.getExpiresAt())) {
            return RuleResult.fail("This promotion has expired");
        }
        if (Boolean.TRUE.equals(promotion.getIsFirstOrderOnly()) && ctx.user().orderCount() > 0) {
            return RuleResult.fail("This offer is for first-time orders only");
        }
        return RuleResult.pass();
    }
}

