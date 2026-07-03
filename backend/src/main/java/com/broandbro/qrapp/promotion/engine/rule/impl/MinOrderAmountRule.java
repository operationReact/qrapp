package com.broandbro.qrapp.promotion.engine.rule.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.broandbro.qrapp.promotion.engine.EligibilityContext;
import com.broandbro.qrapp.promotion.engine.rule.PromotionRule;
import com.broandbro.qrapp.promotion.engine.rule.RuleResult;
import com.broandbro.qrapp.promotion.entity.Promotion;
import com.broandbro.qrapp.promotion.enums.RuleType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Slf4j
@Component
@RequiredArgsConstructor
public class MinOrderAmountRule implements PromotionRule {

    private final ObjectMapper objectMapper;

    @Override
    public boolean supports(RuleType ruleType) {
        return ruleType == RuleType.MIN_ORDER_AMOUNT;
    }

    @Override
    public RuleResult evaluate(EligibilityContext ctx, Promotion promotion, String paramsJson) {
        try {
            JsonNode params = objectMapper.readTree(paramsJson);
            if (!params.hasNonNull("minAmount")) return RuleResult.pass();

            BigDecimal minAmount = params.get("minAmount").decimalValue();
            BigDecimal subtotal  = ctx.cart().subtotal();

            if (subtotal.compareTo(minAmount) < 0) {
                BigDecimal gap = minAmount.subtract(subtotal).setScale(2, RoundingMode.CEILING);
                return RuleResult.failWithGap(
                        "Add ₹" + gap.toPlainString() + " more to unlock this offer", gap
                );
            }
            return RuleResult.pass();
        } catch (Exception e) {
            log.warn("Failed to parse MIN_ORDER_AMOUNT params: {}", paramsJson, e);
            return RuleResult.pass(); // skip broken rule rather than block user
        }
    }
}

