package com.broandbro.qrapp.partnernotification;

/** Only settlement lifecycle events that partners explicitly need to be told about. */
public enum PartnerNotificationType {
    SETTLEMENT_CREATED,
    SETTLEMENT_CALCULATED,
    SETTLEMENT_APPROVED,
    SETTLEMENT_PAID;

    /** Maps a finance audit action to a notifiable event; every other action is intentionally unsupported. */
    public static java.util.Optional<PartnerNotificationType> forSettlementAction(String action) {
        if (action == null) return java.util.Optional.empty();
        return switch (action) {
            case "CREATED" -> java.util.Optional.of(SETTLEMENT_CREATED);
            case "CALCULATED" -> java.util.Optional.of(SETTLEMENT_CALCULATED);
            case "APPROVED" -> java.util.Optional.of(SETTLEMENT_APPROVED);
            case "PAID" -> java.util.Optional.of(SETTLEMENT_PAID);
            default -> java.util.Optional.empty();
        };
    }
}
