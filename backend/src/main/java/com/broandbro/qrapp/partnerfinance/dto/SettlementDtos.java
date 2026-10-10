package com.broandbro.qrapp.partnerfinance.dto;

import com.broandbro.qrapp.partnerfinance.entity.*;
import com.broandbro.qrapp.partnerfinance.enums.*;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public final class SettlementDtos {
    public static final String REFUND_UNAVAILABLE = "SOURCE_UNAVAILABLE_ZERO";
    public static final String REFUND_APPLIED = "APPLIED";
    public static final String TAX_NOTE = "Tax and TDS are not computed; treatment is deferred.";

    private SettlementDtos() {
    }

    public record SettlementResponse(
            Long id, String period, LocalDate periodStart, LocalDate periodEnd, SettlementStatus status,
            String partnerName, TaxTreatment taxTreatment, String taxNote,
            int orderCount, int eligibleOrderCount,
            BigDecimal grossSales, BigDecimal discountTotal, BigDecimal taxTotal, BigDecimal refundTotal,
            BigDecimal netSales, BigDecimal eligibleSales, BigDecimal commissionBasisTotal,
            BigDecimal commissionAmount, BigDecimal adjustmentTotal, BigDecimal netPayable,
            boolean refundDataAvailable, String refundSemantics,
            Instant calculatedAt, Instant approvedAt, String approvedBy,
            Instant paidAt, LocalDate paidOn, String paymentReference, String paymentNote,
            Instant voidedAt, String voidReason, Instant createdAt, Instant updatedAt) {

        public static SettlementResponse from(PartnerSettlement s) {
            return new SettlementResponse(s.getId(), s.getPeriodStart().toString().substring(0, 7),
                    s.getPeriodStart(), s.getPeriodEnd(), s.getStatus(), s.getPartnerNameSnapshot(),
                    s.getTaxTreatment(), TAX_NOTE, s.getOrderCount(), s.getEligibleOrderCount(),
                    s.getGrossSales(), s.getDiscountTotal(), s.getTaxTotal(), s.getRefundTotal(), s.getNetSales(),
                    s.getEligibleSales(), s.getCommissionBasisTotal(), s.getCommissionAmount(),
                    s.getAdjustmentTotal(), s.getNetPayable(), s.isRefundDataAvailable(),
                    s.isRefundDataAvailable() ? REFUND_APPLIED : REFUND_UNAVAILABLE,
                    s.getCalculatedAt(), s.getApprovedAt(), s.getApprovedBy(), s.getPaidAt(), s.getPaidOn(),
                    s.getPaymentReference(), s.getPaymentNote(), s.getVoidedAt(), s.getVoidReason(),
                    s.getCreatedAt(), s.getUpdatedAt());
        }
    }

    public record SettlementDetailResponse(SettlementResponse settlement, List<AdjustmentResponse> adjustments) {
    }

    public record LineItemResponse(
            Long id, Long orderId, String orderNumber, Long locationId, String locationCode, String locationName,
            LocalDateTime completedAt, Long agreementId, boolean commissionApplied, CommissionBasis commissionBasis,
            BigDecimal ratePercent, BigDecimal grossAmount, BigDecimal discountAmount, BigDecimal taxAmount,
            BigDecimal refundAmount, BigDecimal netAmount, boolean eligible, String exclusionReason,
            BigDecimal basisAmount, BigDecimal commissionAmount) {

        public static LineItemResponse from(PartnerSettlementLineItem l) {
            return new LineItemResponse(l.getId(), l.getOrderId(), l.getOrderNumber(), l.getLocationId(),
                    l.getLocationCode(), l.getLocationName(), l.getCompletedAt(), l.getAgreementId(),
                    l.getAgreementId() != null,
                    l.getCommissionBasis() == null ? null : CommissionBasis.valueOf(l.getCommissionBasis()),
                    l.getRatePercent(), l.getGrossAmount(), l.getDiscountAmount(), l.getTaxAmount(),
                    l.getRefundAmount(), l.getNetAmount(), l.isEligible(), l.getExclusionReason(),
                    l.getBasisAmount(), l.getCommissionAmount());
        }
    }

    public record AdjustmentResponse(Long id, AdjustmentType type, BigDecimal amount, String reason,
                                     String createdBy, Instant createdAt) {
        public static AdjustmentResponse from(PartnerSettlementAdjustment a) {
            return new AdjustmentResponse(a.getId(), a.getAdjustmentType(), a.getAmount(), a.getReason(),
                    a.getCreatedBy(), a.getCreatedAt());
        }
    }

    public record AuditResponse(Long id, String action, String actorName, String previousValue, String newValue,
                                String reason, Instant createdAt) {
        public static AuditResponse from(PartnerFinanceAudit a) {
            return new AuditResponse(a.getId(), a.getAction(), a.getActorName(), a.getPreviousValue(),
                    a.getNewValue(), a.getReason(), a.getCreatedAt());
        }
    }

    public record StatusSummary(SettlementStatus status, long count, BigDecimal netPayable) {
    }

    public record FinanceSummaryResponse(List<StatusSummary> byStatus, BigDecimal outstandingPayable,
                                         BigDecimal totalPaid, String taxNote) {
    }

    public record PreviewResponse(String period, LocalDate periodStart, LocalDate periodEnd, boolean periodClosed,
                                  int orderCount, int eligibleOrderCount, BigDecimal grossSales,
                                  BigDecimal discountTotal, BigDecimal taxTotal, BigDecimal refundTotal,
                                  BigDecimal netSales, BigDecimal eligibleSales, BigDecimal commissionBasisTotal,
                                  BigDecimal commissionAmount, boolean refundDataAvailable,
                                  String refundSemantics, boolean agreementCoverage, String taxNote) {
    }

    public record GenerateSettlementRequest(@NotBlank String period, Boolean calculate) {
    }

    public record AdjustmentRequest(@NotNull AdjustmentType type,
                                    @NotNull @DecimalMin("0.01") @Digits(integer = 17, fraction = 2) BigDecimal amount,
                                    @NotBlank @Size(min = 3, max = 500) String reason) {
    }

    public record MarkPaidRequest(@NotBlank @Size(max = 100) String paymentReference, LocalDate paidOn,
                                  @Size(max = 500) String note) {
    }

    public record ReasonRequest(@NotBlank @Size(min = 3, max = 500) String reason) {
    }
}