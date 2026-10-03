package com.broandbro.qrapp.dto.happiness;

import java.math.BigDecimal;

public record HallOfHappinessEligibilityResponse(
        boolean eligible,
        String reason,
        Long orderId,
        String orderType,
        BigDecimal minimumOrderValue,
        BigDecimal currentOrderValue,
        boolean alreadySubmitted,
        boolean invitationSeen,
        boolean invitationDismissed,
        boolean invitationAccepted
) {}
