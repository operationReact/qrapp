package com.broandbro.qrapp.promotion.engine.stacking;

import com.broandbro.qrapp.promotion.entity.Promotion;
import com.broandbro.qrapp.promotion.enums.RewardType;
import com.broandbro.qrapp.promotion.enums.StackMode;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class StackingValidator {

    public StackingResult canStack(List<Promotion> alreadyApplied, Promotion candidate) {
        if (alreadyApplied == null || alreadyApplied.isEmpty()) {
            return StackingResult.allowed();
        }

        for (Promotion applied : alreadyApplied) {
            switch (applied.getStackMode()) {

                case NONE -> {
                    return StackingResult.blocked(
                            "Remove \"" + applied.getTitle() + "\" before applying another offer"
                    );
                }
                case DELIVERY_ONLY -> {
                    boolean candidateIsFreeDelivery = candidate.getReward() != null
                            && candidate.getReward().getRewardType() == RewardType.FREE_DELIVERY;
                    if (!candidateIsFreeDelivery) {
                        return StackingResult.blocked(
                                "\"" + applied.getTitle() + "\" can only stack with free delivery"
                        );
                    }
                }
                case MULTIPLE_ALLOWED -> {
                    if (candidate.getStackMode() != StackMode.MULTIPLE_ALLOWED) {
                        return StackingResult.blocked(
                                "\"" + candidate.getTitle() + "\" cannot be combined with other offers"
                        );
                    }
                }
            }
        }
        return StackingResult.allowed();
    }
}

