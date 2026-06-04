package com.broandbro.qrapp.promotion.engine.reward.impl;

import com.broandbro.qrapp.promotion.engine.CartContext;
import com.broandbro.qrapp.promotion.engine.reward.RewardStrategy;
import com.broandbro.qrapp.promotion.entity.PromotionReward;
import com.broandbro.qrapp.promotion.enums.RewardType;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

@Component
public class FreeDeliveryStrategy implements RewardStrategy {

    @Override
    public RewardType getType() { return RewardType.FREE_DELIVERY; }

    @Override
    public BigDecimal compute(PromotionReward reward, CartContext cart) {
        // Entire delivery fee is waived
        BigDecimal fee = cart.deliveryFee();
        return fee != null ? fee : BigDecimal.ZERO;
    }

    @Override
    public String describe(PromotionReward reward) {
        return "Free delivery";
    }
}

