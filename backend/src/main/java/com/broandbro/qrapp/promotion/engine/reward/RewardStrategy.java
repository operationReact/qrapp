package com.broandbro.qrapp.promotion.engine.reward;

import com.broandbro.qrapp.promotion.engine.CartContext;
import com.broandbro.qrapp.promotion.entity.PromotionReward;
import com.broandbro.qrapp.promotion.enums.RewardType;

import java.math.BigDecimal;

public interface RewardStrategy {
    RewardType getType();
    BigDecimal compute(PromotionReward reward, CartContext cart);
    String describe(PromotionReward reward);
}

