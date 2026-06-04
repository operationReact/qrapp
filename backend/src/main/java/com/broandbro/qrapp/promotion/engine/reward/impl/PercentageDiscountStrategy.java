package com.broandbro.qrapp.promotion.engine.reward.impl;

import com.broandbro.qrapp.promotion.engine.CartContext;
import com.broandbro.qrapp.promotion.engine.reward.RewardStrategy;
import com.broandbro.qrapp.promotion.entity.PromotionReward;
import com.broandbro.qrapp.promotion.enums.RewardType;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Component
public class PercentageDiscountStrategy implements RewardStrategy {

    @Override
    public RewardType getType() { return RewardType.PERCENTAGE_DISCOUNT; }

    @Override
    public BigDecimal compute(PromotionReward reward, CartContext cart) {
        BigDecimal raw = cart.subtotal()
                .multiply(reward.getValue())
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        if (reward.getMaxCap() != null) {
            raw = raw.min(reward.getMaxCap());
        }
        return raw;
    }

    @Override
    public String describe(PromotionReward reward) {
        String base = reward.getValue().stripTrailingZeros().toPlainString() + "% off";
        if (reward.getMaxCap() != null) {
            base += " (up to ₹" + reward.getMaxCap().toPlainString() + ")";
        }
        return base;
    }
}

