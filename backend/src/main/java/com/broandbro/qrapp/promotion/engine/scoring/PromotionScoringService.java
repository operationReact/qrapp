package com.broandbro.qrapp.promotion.engine.scoring;

import com.broandbro.qrapp.promotion.engine.EligibilityResult;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

@Service
public class PromotionScoringService {

    /**
     * score = actualDiscountValue + urgencyBonus
     *
     * Primary factor: how much the customer actually saves (₹).
     * Urgency only differentiates ties.
     */
    public double score(EligibilityResult result) {
        double base    = result.discount() != null ? result.discount().doubleValue() : 0.0;
        double urgency = computeUrgencyBonus(result.promotion().getExpiresAt());
        return base + urgency;
    }

    private double computeUrgencyBonus(LocalDateTime expiresAt) {
        if (expiresAt == null) return 0;
        long hoursLeft = ChronoUnit.HOURS.between(LocalDateTime.now(), expiresAt);
        if (hoursLeft <= 0)  return 0;   // already expired — shouldn't happen here, but guard it
        if (hoursLeft <= 24) return 20;
        if (hoursLeft <= 72) return 10;
        return 0;
    }
}

