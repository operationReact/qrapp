package com.broandbro.qrapp.foodcourt.service;

import com.broandbro.qrapp.foodcourt.dto.DepositRequest;
import com.broandbro.qrapp.foodcourt.dto.DepositResponse;
import com.broandbro.qrapp.foodcourt.dto.DepositSettlementRequest;
import com.broandbro.qrapp.foodcourt.entity.Deposit;
import com.broandbro.qrapp.foodcourt.enums.AuditAction;
import com.broandbro.qrapp.foodcourt.enums.DepositStatus;
import com.broandbro.qrapp.foodcourt.exception.FoodCourtNotFoundException;
import com.broandbro.qrapp.foodcourt.exception.FoodCourtValidationException;
import com.broandbro.qrapp.foodcourt.audit.FoodCourtAuditService;
import com.broandbro.qrapp.foodcourt.repository.DepositRepository;
import com.broandbro.qrapp.foodcourt.repository.FoodCourtRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * Deposit / asset consideration tracking. The original {@link Deposit#getAmount()}
 * is never rewritten; settlements accumulate into {@code refundedAmount} so the
 * historical deposit figure is preserved.
 */
@Service
@RequiredArgsConstructor
public class DepositService {

    private final DepositRepository depositRepository;
    private final FoodCourtRepository foodCourtRepository;
    private final FoodCourtAuditService auditService;

    @Transactional
    public DepositResponse create(UUID foodCourtId, DepositRequest req, String actorUserId) {
        requireFoodCourt(foodCourtId);
        if (req.amount() == null || req.amount().signum() < 0) {
            throw new FoodCourtValidationException("amount_must_be_non_negative");
        }
        Deposit deposit = Deposit.builder()
                .foodCourtId(foodCourtId)
                .leaseType(req.leaseType())
                .leaseId(req.leaseId())
                .tenantId(req.tenantId())
                .depositType(req.depositType())
                .amount(req.amount())
                .refundedAmount(BigDecimal.ZERO)
                .status(DepositStatus.HELD)
                .receivedDate(req.receivedDate())
                .paymentMethod(req.paymentMethod())
                .assetDescription(req.assetDescription())
                .notes(req.notes())
                .createdBy(actorUserId)
                .updatedBy(actorUserId)
                .build();
        deposit = depositRepository.save(deposit);
        auditService.record(foodCourtId, AuditAction.DEPOSIT_RECORDED, "DEPOSIT", deposit.getId(), actorUserId,
                "Recorded deposit of " + deposit.getAmount());
        return toResponse(deposit);
    }

    @Transactional
    public DepositResponse settle(UUID foodCourtId, UUID depositId, DepositSettlementRequest req, String actorUserId) {
        Deposit deposit = requireDeposit(foodCourtId, depositId);
        BigDecimal refund = req.refundAmount() == null ? BigDecimal.ZERO : req.refundAmount();
        BigDecimal newRefunded = deposit.getRefundedAmount().add(refund);
        if (newRefunded.compareTo(deposit.getAmount()) > 0) {
            throw new FoodCourtValidationException("refund_exceeds_deposit_amount");
        }
        deposit.setRefundedAmount(newRefunded);
        deposit.setStatus(req.status());
        if (req.notes() != null) {
            deposit.setNotes(req.notes());
        }
        deposit.setUpdatedBy(actorUserId);
        deposit = depositRepository.save(deposit);
        auditService.record(foodCourtId, AuditAction.DEPOSIT_SETTLED, "DEPOSIT", deposit.getId(), actorUserId,
                "Settled deposit as " + req.status() + (refund.signum() > 0 ? ", refunded " + refund : ""));
        return toResponse(deposit);
    }

    @Transactional(readOnly = true)
    public List<DepositResponse> list(UUID foodCourtId) {
        requireFoodCourt(foodCourtId);
        return depositRepository.findByFoodCourt(foodCourtId).stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public DepositResponse getById(UUID foodCourtId, UUID depositId) {
        return toResponse(requireDeposit(foodCourtId, depositId));
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    DepositResponse toResponse(Deposit d) {
        return new DepositResponse(
                d.getId(), d.getFoodCourtId(), d.getLeaseType(), d.getLeaseId(), d.getTenantId(),
                d.getDepositType(), d.getAmount(), d.getRefundedAmount(), d.getStatus(),
                d.getReceivedDate(), d.getPaymentMethod(), d.getAssetDescription(), d.getNotes());
    }

    private void requireFoodCourt(UUID foodCourtId) {
        if (foodCourtRepository.findActiveById(foodCourtId).isEmpty()) {
            throw new FoodCourtNotFoundException("food_court_not_found: " + foodCourtId);
        }
    }

    private Deposit requireDeposit(UUID foodCourtId, UUID depositId) {
        return depositRepository.findByIdAndFoodCourtId(depositId, foodCourtId)
                .orElseThrow(() -> new FoodCourtNotFoundException("deposit_not_found: " + depositId));
    }
}
