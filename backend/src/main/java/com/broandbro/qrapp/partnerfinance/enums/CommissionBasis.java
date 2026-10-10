package com.broandbro.qrapp.partnerfinance.enums;

/**
 * Sales amount a commission rate is applied to. All amounts are per COMPLETED order, from order snapshots.
 */
public enum CommissionBasis {
    /** Item value before any discount, tax-inclusive (order subtotal). */
    GROSS_SALES,
    /** Amount actually paid (grand total) minus tax and refunds (tax-exclusive). */
    NET_SALES,
    /** NET_SALES restricted to eligible orders (non pre-order, payment settled). */
    ELIGIBLE_SALES
}