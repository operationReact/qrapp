package com.broandbro.qrapp.foodcourt.enums;

/** Action captured in the food court audit trail. */
public enum AuditAction {
    CREATE,
    UPDATE,
    DELETE,
    STATUS_CHANGE,
    RENT_GENERATED,
    PAYMENT_RECORDED,
    ADJUSTMENT_APPLIED,
    DEPOSIT_RECORDED,
    DEPOSIT_SETTLED,
    ACCESS_GRANTED,
    ACCESS_REVOKED
}
