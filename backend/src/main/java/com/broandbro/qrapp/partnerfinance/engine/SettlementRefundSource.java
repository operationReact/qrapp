package com.broandbro.qrapp.partnerfinance.engine;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.Map;

/**
 * Contract for refund data. No refund entity exists yet, so the default implementation reports refunds as
 * unavailable (zero). A future refund module only needs to provide a bean replacing the default one.
 */
public interface SettlementRefundSource {

    /** False when refund data cannot be provided; amounts are then treated as zero and flagged to clients. */
    boolean isAvailable();

    /** Tax-inclusive refunded amount per order id; orders without refunds may be omitted. */
    Map<Long, BigDecimal> refundsByOrderId(Collection<Long> orderIds);
}