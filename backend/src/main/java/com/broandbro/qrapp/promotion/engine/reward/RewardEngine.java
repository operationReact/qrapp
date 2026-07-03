package com.broandbro.qrapp.promotion.engine.reward;

import com.broandbro.qrapp.promotion.engine.CartContext;
import com.broandbro.qrapp.promotion.entity.PromotionReward;
import com.broandbro.qrapp.promotion.enums.RewardType;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class RewardEngine {

    private final Map<RewardType, RewardStrategy> strategies;

    public RewardEngine(List<RewardStrategy> strategyList) {
        this.strategies = strategyList.stream()
                .collect(Collectors.toMap(RewardStrategy::getType, Function.identity()));
    }

    public BigDecimal compute(PromotionReward reward, CartContext cart) {
        RewardStrategy strategy = strategies.get(reward.getRewardType());
        if (strategy == null) {
            throw new IllegalStateException("No strategy for reward type: " + reward.getRewardType());
        }
        return strategy.compute(reward, cart);
    }

    public String describe(PromotionReward reward) {
        RewardStrategy strategy = strategies.get(reward.getRewardType());
        if (strategy == null) return reward.getRewardType().name();
        return strategy.describe(reward);
    }
}

