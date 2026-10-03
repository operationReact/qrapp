package com.broandbro.qrapp.foodcourt.service;

import com.broandbro.qrapp.foodcourt.dto.ExpenseRequest;
import com.broandbro.qrapp.foodcourt.dto.ExpenseResponse;
import com.broandbro.qrapp.foodcourt.entity.Expense;
import com.broandbro.qrapp.foodcourt.enums.AuditAction;
import com.broandbro.qrapp.foodcourt.exception.FoodCourtNotFoundException;
import com.broandbro.qrapp.foodcourt.audit.FoodCourtAuditService;
import com.broandbro.qrapp.foodcourt.repository.ExpenseRepository;
import com.broandbro.qrapp.foodcourt.repository.FoodCourtRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/** Operating expense CRUD scoped to a food court. */
@Service
@RequiredArgsConstructor
public class ExpenseService {

    private final ExpenseRepository expenseRepository;
    private final FoodCourtRepository foodCourtRepository;
    private final FoodCourtAuditService auditService;

    @Transactional
    public ExpenseResponse create(UUID foodCourtId, ExpenseRequest req, String actorUserId) {
        requireFoodCourt(foodCourtId);
        Expense expense = Expense.builder()
                .foodCourtId(foodCourtId)
                .category(req.category())
                .amount(req.amount())
                .expenseDate(req.expenseDate())
                .paymentMethod(req.paymentMethod())
                .vendorName(req.vendorName())
                .description(req.description())
                .recordedBy(actorUserId)
                .createdBy(actorUserId)
                .updatedBy(actorUserId)
                .build();
        expense = expenseRepository.save(expense);
        auditService.record(foodCourtId, AuditAction.CREATE, "EXPENSE", expense.getId(), actorUserId,
                "Recorded " + req.category() + " expense of " + req.amount());
        return toResponse(expense);
    }

    @Transactional
    public ExpenseResponse update(UUID foodCourtId, UUID expenseId, ExpenseRequest req, String actorUserId) {
        Expense expense = requireExpense(foodCourtId, expenseId);
        expense.setCategory(req.category());
        expense.setAmount(req.amount());
        expense.setExpenseDate(req.expenseDate());
        expense.setPaymentMethod(req.paymentMethod());
        expense.setVendorName(req.vendorName());
        expense.setDescription(req.description());
        expense.setUpdatedBy(actorUserId);
        expense = expenseRepository.save(expense);
        auditService.record(foodCourtId, AuditAction.UPDATE, "EXPENSE", expense.getId(), actorUserId,
                "Updated expense");
        return toResponse(expense);
    }

    @Transactional
    public void delete(UUID foodCourtId, UUID expenseId, String actorUserId) {
        Expense expense = requireExpense(foodCourtId, expenseId);
        expense.setDeletedAt(Instant.now());
        expense.setUpdatedBy(actorUserId);
        expenseRepository.save(expense);
        auditService.record(foodCourtId, AuditAction.DELETE, "EXPENSE", expense.getId(), actorUserId,
                "Deleted expense");
    }

    @Transactional(readOnly = true)
    public List<ExpenseResponse> list(UUID foodCourtId, LocalDate from, LocalDate to) {
        requireFoodCourt(foodCourtId);
        List<Expense> expenses;
        if (from == null && to == null) {
            expenses = expenseRepository.findByFoodCourt(foodCourtId);
        } else if (from == null) {
            expenses = expenseRepository.findByFoodCourtTo(foodCourtId, to);
        } else if (to == null) {
            expenses = expenseRepository.findByFoodCourtFrom(foodCourtId, from);
        } else {
            expenses = expenseRepository.findByFoodCourtAndRange(foodCourtId, from, to);
        }
        return expenses.stream()
                .map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public ExpenseResponse getById(UUID foodCourtId, UUID expenseId) {
        return toResponse(requireExpense(foodCourtId, expenseId));
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    ExpenseResponse toResponse(Expense e) {
        return new ExpenseResponse(
                e.getId(), e.getFoodCourtId(), e.getCategory(), e.getAmount(), e.getExpenseDate(),
                e.getPaymentMethod(), e.getVendorName(), e.getDescription(), e.getRecordedBy());
    }

    private void requireFoodCourt(UUID foodCourtId) {
        if (foodCourtRepository.findActiveById(foodCourtId).isEmpty()) {
            throw new FoodCourtNotFoundException("food_court_not_found: " + foodCourtId);
        }
    }

    private Expense requireExpense(UUID foodCourtId, UUID expenseId) {
        Expense expense = expenseRepository.findActiveById(expenseId)
                .orElseThrow(() -> new FoodCourtNotFoundException("expense_not_found: " + expenseId));
        if (!expense.getFoodCourtId().equals(foodCourtId)) {
            throw new FoodCourtNotFoundException("expense_not_found_in_food_court: " + expenseId);
        }
        return expense;
    }
}
