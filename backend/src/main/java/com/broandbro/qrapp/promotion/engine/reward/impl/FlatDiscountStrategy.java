package com.broandbro.qrapp.promotion.engine.reward.impl;

import com.broandbro.qrapp.promotion.engine.CartContext;
import com.broandbro.qrapp.promotion.engine.reward.RewardStrategy;
import com.broandbro.qrapp.promotion.entity.PromotionReward;
import com.broandbro.qrapp.promotion.enums.RewardType;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

@Component
public class FlatDiscountStrategy implements RewardStrategy {

    @Override
    public RewardType getType() { return RewardType.FLAT_DISCOUNT; }

    @Override
    public BigDecimal compute(PromotionReward reward, CartContext cart) {
        // Flat discount cannot exceed the cart subtotal
        return reward.getValue().min(cart.subtotal());
    }

    @Override
    public String describe(PromotionReward reward) {
        return "₹" + reward.getValue().toPlainString() + " off";
    }
}

