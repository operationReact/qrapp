package com.broandbro.qrapp.foodcourt.service;

import com.broandbro.qrapp.foodcourt.dto.RentAdjustmentRequest;
import com.broandbro.qrapp.foodcourt.dto.RentAdjustmentResponse;
import com.broandbro.qrapp.foodcourt.dto.RentGenerationResultResponse;
import com.broandbro.qrapp.foodcourt.dto.RentInvoiceResponse;
import com.broandbro.qrapp.foodcourt.dto.RentPaymentRequest;
import com.broandbro.qrapp.foodcourt.dto.RentPaymentResponse;
import com.broandbro.qrapp.foodcourt.entity.RentAdjustment;
import com.broandbro.qrapp.foodcourt.entity.RentInvoice;
import com.broandbro.qrapp.foodcourt.entity.RentPayment;
import com.broandbro.qrapp.foodcourt.entity.Stall;
import com.broandbro.qrapp.foodcourt.entity.StallLease;
import com.broandbro.qrapp.foodcourt.entity.Tenant;
import com.broandbro.qrapp.foodcourt.enums.AuditAction;
import com.broandbro.qrapp.foodcourt.enums.LeaseStatus;
import com.broandbro.qrapp.foodcourt.enums.RentInvoiceStatus;
import com.broandbro.qrapp.foodcourt.exception.FoodCourtNotFoundException;
import com.broandbro.qrapp.foodcourt.exception.FoodCourtValidationException;
import com.broandbro.qrapp.foodcourt.audit.FoodCourtAuditService;
import com.broandbro.qrapp.foodcourt.repository.FoodCourtRepository;
import com.broandbro.qrapp.foodcourt.repository.RentAdjustmentRepository;
import com.broandbro.qrapp.foodcourt.repository.RentInvoiceRepository;
import com.broandbro.qrapp.foodcourt.repository.RentPaymentRepository;
import com.broandbro.qrapp.foodcourt.repository.StallLeaseRepository;
import com.broandbro.qrapp.foodcourt.repository.StallRepository;
import com.broandbro.qrapp.foodcourt.repository.TenantRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Rent generation and settlement. Generated invoices snapshot the lease rent so
 * later rent changes never rewrite historical charges; duplicate (lease, month)
 * generation is prevented. Payments and adjustments are append-only financial
 * records; the invoice's running totals and status are recomputed from them.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RentService {

    private final RentInvoiceRepository invoiceRepository;
    private final RentPaymentRepository paymentRepository;
    private final RentAdjustmentRepository adjustmentRepository;
    private final StallLeaseRepository leaseRepository;
    private final StallRepository stallRepository;
    private final TenantRepository tenantRepository;
    private final FoodCourtRepository foodCourtRepository;
    private final FoodCourtAuditService auditService;

    @Transactional
    public RentGenerationResultResponse generate(UUID foodCourtId, int year, int month,
                                                 List<UUID> stallLeaseIds, String actorUserId) {
        requireFoodCourt(foodCourtId);
        if (month < 1 || month > 12) {
            throw new FoodCourtValidationException("month_must_be_between_1_and_12");
        }
        List<StallLease> leases = resolveLeases(foodCourtId, stallLeaseIds);
        List<RentInvoiceResponse> generated = new ArrayList<>();
        int skipped = 0;
        for (StallLease lease : leases) {
            if (lease.getStatus() != LeaseStatus.ACTIVE) {
                continue;
            }
            if (invoiceRepository.existsByStallLeaseIdAndPeriodYearAndPeriodMonth(lease.getId(), year, month)) {
                skipped++;
                continue;
            }
            BigDecimal rent = lease.getMonthlyRent() == null ? BigDecimal.ZERO : lease.getMonthlyRent();
            RentInvoice invoice = RentInvoice.builder()
                    .foodCourtId(foodCourtId)
                    .stallLeaseId(lease.getId())
                    .stallId(lease.getStallId())
                    .tenantId(lease.getTenantId())
                    .periodYear(year)
                    .periodMonth(month)
                    .dueDate(dueDate(year, month, lease.getRentDueDay()))
                    .rentAmount(rent)
                    .adjustmentTotal(BigDecimal.ZERO)
                    .netAmount(rent)
                    .amountPaid(BigDecimal.ZERO)
                    .status(RentInvoiceStatus.PENDING)
                    .createdBy(actorUserId)
                    .updatedBy(actorUserId)
                    .build();
            invoice = invoiceRepository.save(invoice);
            auditService.record(foodCourtId, AuditAction.RENT_GENERATED, "RENT_INVOICE", invoice.getId(),
                    actorUserId, "Generated rent for " + year + "-" + month);
            generated.add(toResponse(invoice));
        }
        return new RentGenerationResultResponse(year, month, generated.size(), skipped, generated);
    }

    @Transactional(readOnly = true)
    public List<RentInvoiceResponse> listInvoices(UUID foodCourtId, Integer year, Integer month) {
        requireFoodCourt(foodCourtId);
        return invoiceRepository.findByFoodCourtAndPeriod(foodCourtId, year, month).stream()
                .map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public RentInvoiceResponse getInvoice(UUID foodCourtId, UUID invoiceId) {
        return toResponse(requireInvoice(foodCourtId, invoiceId));
    }

    @Transactional
    public RentPaymentResponse recordPayment(UUID foodCourtId, UUID invoiceId, RentPaymentRequest req,
                                             String actorUserId) {
        RentInvoice invoice = requireInvoice(foodCourtId, invoiceId);
        if (invoice.getStatus() == RentInvoiceStatus.CANCELLED) {
            throw new FoodCourtValidationException("cannot_pay_cancelled_invoice");
        }
        if (req.amount() == null || req.amount().signum() <= 0) {
            throw new FoodCourtValidationException("payment_amount_must_be_positive");
        }
        BigDecimal outstanding = invoice.getNetAmount().subtract(invoice.getAmountPaid());
        if (req.amount().compareTo(outstanding) > 0) {
            throw new FoodCourtValidationException("payment_exceeds_outstanding_amount");
        }
        Instant paidAt = req.paidAt() == null ? Instant.now() : req.paidAt();
        RentPayment payment = RentPayment.builder()
                .foodCourtId(foodCourtId)
                .rentInvoiceId(invoiceId)
                .amount(req.amount())
                .paymentMethod(req.paymentMethod())
                .paidAt(paidAt)
                .reference(req.reference())
                .recordedBy(actorUserId)
                .notes(req.notes())
                .createdBy(actorUserId)
                .updatedBy(actorUserId)
                .build();
        payment = paymentRepository.save(payment);

        invoice.setAmountPaid(invoice.getAmountPaid().add(req.amount()));
        invoice.setStatus(recomputeStatus(invoice));
        invoice.setUpdatedBy(actorUserId);
        invoiceRepository.save(invoice);

        auditService.record(foodCourtId, AuditAction.PAYMENT_RECORDED, "RENT_INVOICE", invoiceId, actorUserId,
                "Recorded payment of " + req.amount());
        return toResponse(payment);
    }

    @Transactional
    public RentAdjustmentResponse applyAdjustment(UUID foodCourtId, UUID invoiceId, RentAdjustmentRequest req,
                                                  String actorUserId) {
        RentInvoice invoice = requireInvoice(foodCourtId, invoiceId);
        if (invoice.getStatus() == RentInvoiceStatus.CANCELLED) {
            throw new FoodCourtValidationException("cannot_adjust_cancelled_invoice");
        }
        if (req.amount() == null || req.amount().signum() == 0) {
            throw new FoodCourtValidationException("adjustment_amount_must_be_non_zero");
        }
        RentAdjustment adjustment = RentAdjustment.builder()
                .foodCourtId(foodCourtId)
                .rentInvoiceId(invoiceId)
                .adjustmentType(req.adjustmentType())
                .amount(req.amount())
                .reason(req.reason())
                .appliedBy(actorUserId)
                .createdBy(actorUserId)
                .updatedBy(actorUserId)
                .build();
        adjustment = adjustmentRepository.save(adjustment);

        // rentAmount is preserved; only the running adjustment/net totals move.
        invoice.setAdjustmentTotal(invoice.getAdjustmentTotal().add(req.amount()));
        invoice.setNetAmount(invoice.getRentAmount().add(invoice.getAdjustmentTotal()));
        invoice.setStatus(recomputeStatus(invoice));
        invoice.setUpdatedBy(actorUserId);
        invoiceRepository.save(invoice);

        auditService.record(foodCourtId, AuditAction.ADJUSTMENT_APPLIED, "RENT_INVOICE", invoiceId, actorUserId,
                "Applied " + req.adjustmentType() + " adjustment of " + req.amount());
        return toResponse(adjustment);
    }

    @Transactional(readOnly = true)
    public List<RentPaymentResponse> listPayments(UUID foodCourtId, UUID invoiceId) {
        requireInvoice(foodCourtId, invoiceId);
        return paymentRepository.findByInvoice(invoiceId).stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<RentAdjustmentResponse> listAdjustments(UUID foodCourtId, UUID invoiceId) {
        requireInvoice(foodCourtId, invoiceId);
        return adjustmentRepository.findByInvoice(invoiceId).stream().map(this::toResponse).toList();
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private RentInvoiceStatus recomputeStatus(RentInvoice invoice) {
        BigDecimal net = invoice.getNetAmount();
        BigDecimal paid = invoice.getAmountPaid();
        if (net.signum() <= 0) {
            return paid.signum() > 0 ? RentInvoiceStatus.PAID : RentInvoiceStatus.WAIVED;
        }
        if (paid.compareTo(net) >= 0) {
            return RentInvoiceStatus.PAID;
        }
        if (paid.signum() > 0) {
            return RentInvoiceStatus.PARTIALLY_PAID;
        }
        return RentInvoiceStatus.PENDING;
    }

    private List<StallLease> resolveLeases(UUID foodCourtId, List<UUID> stallLeaseIds) {
        if (stallLeaseIds == null || stallLeaseIds.isEmpty()) {
            return leaseRepository.findByFoodCourtAndStatus(foodCourtId, LeaseStatus.ACTIVE);
        }
        List<StallLease> leases = leaseRepository.findByIdInAndFoodCourtId(stallLeaseIds, foodCourtId);
        if (leases.size() != stallLeaseIds.stream().distinct().count()) {
            throw new FoodCourtNotFoundException("one_or_more_leases_not_found_in_food_court");
        }
        return leases;
    }

    private LocalDate dueDate(int year, int month, Integer rentDueDay) {
        LocalDate first = LocalDate.of(year, month, 1);
        int day = rentDueDay == null ? 5 : Math.min(Math.max(rentDueDay, 1), first.lengthOfMonth());
        return first.withDayOfMonth(day);
    }

    private RentInvoice requireInvoice(UUID foodCourtId, UUID invoiceId) {
        return invoiceRepository.findByIdAndFoodCourtId(invoiceId, foodCourtId)
                .orElseThrow(() -> new FoodCourtNotFoundException("rent_invoice_not_found: " + invoiceId));
    }

    private void requireFoodCourt(UUID foodCourtId) {
        if (foodCourtRepository.findActiveById(foodCourtId).isEmpty()) {
            throw new FoodCourtNotFoundException("food_court_not_found: " + foodCourtId);
        }
    }

    RentInvoiceResponse toResponse(RentInvoice i) {
        String stallCode = stallRepository.findActiveById(i.getStallId()).map(Stall::getCode).orElse(null);
        String tenantName = tenantRepository.findActiveById(i.getTenantId()).map(Tenant::getName).orElse(null);
        LocalDate today = com.broandbro.qrapp.time.BusinessTime.today();
        BigDecimal balance = i.getNetAmount().subtract(i.getAmountPaid());
        RentInvoiceStatus status = i.getStatus();
        long overdueDays = 0;
        if (balance.signum() > 0 && today.isAfter(i.getDueDate())) {
            status = RentInvoiceStatus.OVERDUE;
            overdueDays = ChronoUnit.DAYS.between(i.getDueDate(), today);
        } else if (balance.signum() > 0 && !today.isAfter(i.getDueDate())
                && !today.plusDays(7).isBefore(i.getDueDate())) {
            status = RentInvoiceStatus.DUE_SOON;
        }
        return new RentInvoiceResponse(
                i.getId(), i.getFoodCourtId(), i.getStallLeaseId(), i.getStallId(), stallCode,
                i.getTenantId(), tenantName, i.getPeriodYear(), i.getPeriodMonth(), i.getDueDate(),
                i.getRentAmount(), i.getAdjustmentTotal(), i.getNetAmount(), i.getAmountPaid(), balance,
                status, i.getNotes(), overdueDays);
    }

    RentPaymentResponse toResponse(RentPayment p) {
        return new RentPaymentResponse(
                p.getId(), p.getFoodCourtId(), p.getRentInvoiceId(), p.getAmount(), p.getPaymentMethod(),
                p.getPaidAt(), p.getReference(), p.getRecordedBy(), p.getNotes());
    }

    RentAdjustmentResponse toResponse(RentAdjustment a) {
        return new RentAdjustmentResponse(
                a.getId(), a.getFoodCourtId(), a.getRentInvoiceId(), a.getAdjustmentType(),
                a.getAmount(), a.getReason(), a.getAppliedBy(), a.getCreatedAt());
    }
}
