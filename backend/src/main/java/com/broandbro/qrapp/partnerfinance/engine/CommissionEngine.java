package com.broandbro.qrapp.partnerfinance.engine;

import com.broandbro.qrapp.partnerfinance.enums.CommissionBasis;
import com.broandbro.qrapp.partnerfinance.enums.CommissionType;
import com.broandbro.qrapp.service.MoneyService;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Reusable, stateless BigDecimal commission engine. Every monetary result is normalised through
 * {@link MoneyService}; no floating point is used anywhere.
 */
@Component
public class CommissionEngine {

    public record CommissionRule(CommissionType type, CommissionBasis basis, BigDecimal ratePercent) {
        public CommissionRule {
            if (type == null || basis == null || ratePercent == null) {
                throw new IllegalArgumentException("commission_rule_incomplete");
            }
            if (ratePercent.signum() < 0 || ratePercent.compareTo(BigDecimal.valueOf(100)) > 0) {
                throw new IllegalArgumentException("commission_rate_out_of_range");
            }
        }
    }

    /**
     * Raw order snapshot values. {@code refund} is the tax-inclusive amount returned to the customer;
     * it is zero whenever no refund source exists.
     */
    public record OrderAmounts(BigDecimal gross, BigDecimal discount, BigDecimal tax, BigDecimal grandTotal,
                               BigDecimal refund, boolean eligible) {
    }

    public record OrderSales(BigDecimal gross, BigDecimal discount, BigDecimal tax, BigDecimal grandTotal,
                             BigDecimal refund, BigDecimal refundNet, BigDecimal net, boolean eligible) {
    }

    public record CommissionResult(OrderSales sales, BigDecimal basisAmount, BigDecimal ratePercent,
                                   BigDecimal commission) {
    }

    /**
     * Normalises an order into sales figures.
     * <ul>
     *   <li>gross = order subtotal (falls back to grandTotal + discount for legacy rows)</li>
     *   <li>refundNet = refund apportioned to the tax-exclusive value of the order</li>
     *   <li>net = grandTotal - tax - refundNet</li>
     * </ul>
     */
    public OrderSales sales(OrderAmounts in) {
        BigDecimal grandTotal = MoneyService.amount(in.grandTotal());
        BigDecimal discount = MoneyService.amount(in.discount());
        BigDecimal tax = MoneyService.amount(in.tax());
        BigDecimal gross = in.gross() == null ? grandTotal.add(discount) : MoneyService.amount(in.gross());
        BigDecimal refund = MoneyService.amount(in.refund());
        if (refund.signum() < 0) {
            throw new IllegalArgumentException("refund_must_not_be_negative");
        }
        if (refund.compareTo(grandTotal) > 0) {
            throw new IllegalArgumentException("refund_exceeds_order_total");
        }
        BigDecimal taxExclusive = grandTotal.subtract(tax);
        BigDecimal refundNet = BigDecimal.ZERO.setScale(MoneyService.SCALE);
        if (refund.signum() > 0 && grandTotal.signum() > 0) {
            refundNet = MoneyService.amount(refund.multiply(taxExclusive)
                    .divide(grandTotal, 8, RoundingMode.HALF_UP));
        }
        BigDecimal net = taxExclusive.subtract(refundNet);
        return new OrderSales(gross, discount, tax, grandTotal, refund, refundNet, net, in.eligible());
    }

    public BigDecimal basisAmount(CommissionBasis basis, OrderSales sales) {
        return switch (basis) {
            case GROSS_SALES -> sales.gross();
            case NET_SALES -> sales.net();
            case ELIGIBLE_SALES -> sales.eligible() ? sales.net() : MoneyService.amount(BigDecimal.ZERO);
        };
    }

    /** Commission for one order under the given rule; rounding happens once per order (HALF_UP, scale 2). */
    public CommissionResult calculate(CommissionRule rule, OrderAmounts amounts) {
        OrderSales sales = sales(amounts);
        BigDecimal basisAmount = basisAmount(rule.basis(), sales);
        BigDecimal commission = switch (rule.type()) {
            case PERCENTAGE -> MoneyService.percentage(basisAmount, rule.ratePercent());
        };
        return new CommissionResult(sales, basisAmount, rule.ratePercent(), commission);
    }

    /** Result for an order that no agreement covers: sales are recorded, commission is zero. */
    public CommissionResult withoutAgreement(OrderAmounts amounts) {
        OrderSales sales = sales(amounts);
        BigDecimal zero = MoneyService.amount(BigDecimal.ZERO);
        return new CommissionResult(sales, zero, null, zero);
    }
}
