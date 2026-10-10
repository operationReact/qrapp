package com.broandbro.qrapp.partnerfinance.enums;

import java.util.EnumSet;
import java.util.Set;

public enum SettlementStatus {
    DRAFT,
    CALCULATED,
    APPROVED,
    PAID,
    VOID;

    public Set<SettlementStatus> allowedNext() {
        return switch (this) {
            case DRAFT -> EnumSet.of(CALCULATED, VOID);
            case CALCULATED -> EnumSet.of(APPROVED, VOID);
            case APPROVED -> EnumSet.of(PAID, VOID);
            case PAID, VOID -> EnumSet.noneOf(SettlementStatus.class);
        };
    }

    public boolean canTransitionTo(SettlementStatus next) {
        return allowedNext().contains(next);
    }

    /** Line items and adjustments may only change while the settlement is still open. */
    public boolean isOpen() {
        return this == DRAFT || this == CALCULATED;
    }
}