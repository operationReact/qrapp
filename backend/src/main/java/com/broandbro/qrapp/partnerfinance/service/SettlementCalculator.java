package com.broandbro.qrapp.partnerfinance.service;

import com.broandbro.qrapp.partnerfinance.engine.CommissionEngine;
import com.broandbro.qrapp.partnerfinance.engine.CommissionEngine.CommissionResult;
import com.broandbro.qrapp.partnerfinance.engine.CommissionEngine.CommissionRule;
import com.broandbro.qrapp.partnerfinance.engine.CommissionEngine.OrderAmounts;
import com.broandbro.qrapp.partnerfinance.engine.OrderEligibility;
import com.broandbro.qrapp.partnerfinance.engine.SettlementPeriod;
import com.broandbro.qrapp.partnerfinance.engine.SettlementRefundSource;
import com.broandbro.qrapp.partnerfinance.entity.PartnerCommissionAgreement;
import com.broandbro.qrapp.partnerfinance.entity.PartnerSettlementLineItem;
import com.broandbro.qrapp.partnerfinance.exception.PartnerFinanceException;
import com.broandbro.qrapp.partnerfinance.repository.SettlementOrderRepository;
import com.broandbro.qrapp.partnerfinance.repository.SettlementOrderRepository.OrderRow;
import com.broandbro.qrapp.service.MoneyService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Turns the partner's completed orders for a period into commission line items. Orders are selected
 * and filtered by the database; each order's commission uses the agreement effective on its completion
 * date (Asia/Kolkata), so agreement changes inside a month are handled per order.
 */
@Service
@RequiredArgsConstructor
public class SettlementCalculator {
    static final int PAGE_SIZE = 1000;

    private final SettlementOrderRepository orders;
    private final CommissionEngine engine;
    private final SettlementRefundSource refundSource;

    public List<PartnerSettlementLineItem> calculate(Long partnerId, SettlementPeriod period,
                                                     List<PartnerCommissionAgreement> agreements,
                                                     Long settlementId) {
        List<PartnerSettlementLineItem> lines = new ArrayList<>();
        Pageable pageable = PageRequest.of(0, PAGE_SIZE);
        Slice<OrderRow> slice;
        do {
            slice = orders.findOrderRows(partnerId, period.startDateTime(), period.endExclusiveDateTime(), pageable);
            Map<Long, BigDecimal> refunds = refundSource.isAvailable()
                    ? refundSource.refundsByOrderId(slice.getContent().stream().map(OrderRow::orderId).toList())
                    : Map.of();
            for (OrderRow row : slice.getContent()) {
                lines.add(toLine(partnerId, settlementId, row, agreements, refunds.get(row.orderId())));
            }
            pageable = slice.nextPageable();
        } while (slice.hasNext());
        return lines;
    }

    PartnerSettlementLineItem toLine(Long partnerId, Long settlementId, OrderRow row,
                                     List<PartnerCommissionAgreement> agreements, BigDecimal refund) {
        String exclusion = OrderEligibility.exclusionReason(row.preOrder(), row.paymentStatus(), row.paymentMethod());
        OrderAmounts amounts = new OrderAmounts(row.subtotal(), row.couponDiscount(), row.tax(), row.grandTotal(),
                refund, exclusion == null);
        LocalDate completedDate = row.completedAt().toLocalDate();
        PartnerCommissionAgreement agreement = agreements.stream()
                .filter(candidate -> candidate.covers(completedDate)).findFirst().orElse(null);
        CommissionResult result;
        try {
            result = agreement == null
                    ? engine.withoutAgreement(amounts)
                    : engine.calculate(new CommissionRule(agreement.getCommissionType(),
                    agreement.getCommissionBasis(), agreement.getRatePercent()), amounts);
        } catch (IllegalArgumentException e) {
            throw PartnerFinanceException.conflict(e.getMessage());
        }
        CommissionEngine.OrderSales sales = result.sales();
        return PartnerSettlementLineItem.builder()
                .settlementId(settlementId)
                .partnerId(partnerId)
                .orderId(row.orderId())
                .orderNumber(row.orderNumber())
                .locationId(row.locationId())
                .locationCode(row.locationCode())
                .locationName(row.locationName())
                .completedAt(row.completedAt())
                .agreementId(agreement == null ? null : agreement.getId())
                .commissionBasis(agreement == null ? null : agreement.getCommissionBasis().name())
                .ratePercent(result.ratePercent())
                .grossAmount(sales.gross())
                .discountAmount(sales.discount())
                .taxAmount(sales.tax())
                .grandTotal(sales.grandTotal())
                .refundAmount(sales.refund())
                .refundNetAmount(sales.refundNet())
                .netAmount(sales.net())
                .eligible(sales.eligible())
                .exclusionReason(exclusion)
                .basisAmount(MoneyService.amount(result.basisAmount()))
                .commissionAmount(MoneyService.amount(result.commission()))
                .build();
    }

    public boolean refundDataAvailable() {
        return refundSource.isAvailable();
    }
}