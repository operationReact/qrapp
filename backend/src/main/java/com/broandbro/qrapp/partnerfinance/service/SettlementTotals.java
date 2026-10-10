package com.broandbro.qrapp.partnerfinance.service;

import com.broandbro.qrapp.partnerfinance.entity.PartnerSettlementLineItem;
import com.broandbro.qrapp.service.MoneyService;

import java.math.BigDecimal;
import java.util.List;

/** Aggregates of settlement line items. {@code netPayable} is added separately from adjustments. */
public record SettlementTotals(int orderCount, int eligibleOrderCount, BigDecimal gross, BigDecimal discount,
                               BigDecimal tax, BigDecimal refund, BigDecimal grandTotal, BigDecimal net,
                               BigDecimal eligibleSales, BigDecimal basis, BigDecimal commission) {

    public static SettlementTotals of(List<PartnerSettlementLineItem> lines) {
        BigDecimal gross = BigDecimal.ZERO, discount = BigDecimal.ZERO, tax = BigDecimal.ZERO,
                refund = BigDecimal.ZERO, grand = BigDecimal.ZERO, net = BigDecimal.ZERO,
                eligibleSales = BigDecimal.ZERO, basis = BigDecimal.ZERO, commission = BigDecimal.ZERO;
        int eligible = 0;
        for (PartnerSettlementLineItem line : lines) {
            gross = gross.add(line.getGrossAmount());
            discount = discount.add(line.getDiscountAmount());
            tax = tax.add(line.getTaxAmount());
            refund = refund.add(line.getRefundAmount());
            grand = grand.add(line.getGrandTotal());
            net = net.add(line.getNetAmount());
            basis = basis.add(line.getBasisAmount());
            commission = commission.add(line.getCommissionAmount());
            if (line.isEligible()) {
                eligible++;
                eligibleSales = eligibleSales.add(line.getNetAmount());
            }
        }
        return new SettlementTotals(lines.size(), eligible, MoneyService.amount(gross), MoneyService.amount(discount),
                MoneyService.amount(tax), MoneyService.amount(refund), MoneyService.amount(grand),
                MoneyService.amount(net), MoneyService.amount(eligibleSales), MoneyService.amount(basis),
                MoneyService.amount(commission));
    }
}