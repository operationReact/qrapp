package com.broandbro.qrapp.foodcourt.enums;

/**
 * Payment instrument used for a financial transaction. Nullable in storage:
 * historical records whose method is unknown leave it blank rather than
 * guessing.
 */
public enum PaymentMethod {
    CASH,
    BANK_TRANSFER,
    UPI,
    CHEQUE,
    ASSET,
    OTHER
}
