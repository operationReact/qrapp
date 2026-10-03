package com.broandbro.qrapp.foodcourt.service;

import com.broandbro.qrapp.foodcourt.dto.FoodCourtDashboardResponse;
import com.broandbro.qrapp.foodcourt.dto.FoodCourtFinancialReportResponse;
import com.broandbro.qrapp.foodcourt.dto.FoodCourtRequest;
import com.broandbro.qrapp.foodcourt.dto.FoodCourtResponse;
import com.broandbro.qrapp.foodcourt.entity.FoodCourt;
import com.broandbro.qrapp.foodcourt.entity.StallLease;
import com.broandbro.qrapp.foodcourt.enums.AuditAction;
import com.broandbro.qrapp.foodcourt.enums.FoodCourtStatus;
import com.broandbro.qrapp.foodcourt.enums.LeaseStatus;
import com.broandbro.qrapp.foodcourt.exception.FoodCourtNotFoundException;
import com.broandbro.qrapp.foodcourt.exception.FoodCourtValidationException;
import com.broandbro.qrapp.foodcourt.audit.FoodCourtAuditService;
import com.broandbro.qrapp.foodcourt.repository.ActionItemRepository;
import com.broandbro.qrapp.foodcourt.repository.DepositRepository;
import com.broandbro.qrapp.foodcourt.repository.ExpenseRepository;
import com.broandbro.qrapp.foodcourt.repository.FoodCourtRepository;
import com.broandbro.qrapp.foodcourt.repository.RentInvoiceRepository;
import com.broandbro.qrapp.foodcourt.repository.StallLeaseRepository;
import com.broandbro.qrapp.foodcourt.repository.StallRepository;
import com.broandbro.qrapp.foodcourt.repository.PropertyLeaseRepository;
import com.broandbro.qrapp.time.BusinessTime;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * CRUD, list/detail, dashboard and financial reporting for food courts. List
 * results are scoped server-side to the caller's accessible food courts; an
 * empty scope sees nothing while {@link Optional#empty()} means unrestricted.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FoodCourtService {

    private final FoodCourtRepository foodCourtRepository;
    private final StallRepository stallRepository;
    private final StallLeaseRepository stallLeaseRepository;
    private final DepositRepository depositRepository;
    private final RentInvoiceRepository rentInvoiceRepository;
    private final ExpenseRepository expenseRepository;
    private final ActionItemRepository actionItemRepository;
    private final PropertyLeaseRepository propertyLeaseRepository;
    private final FoodCourtAuditService auditService;

    @Transactional
    public FoodCourtResponse create(FoodCourtRequest req, String actorUserId) {
        String code = normaliseCode(req.code());
        if (foodCourtRepository.existsByCodeIgnoreCase(code)) {
            throw new FoodCourtValidationException("food_court_code_already_exists");
        }
        FoodCourt fc = FoodCourt.builder()
                .code(code)
                .name(req.name().trim())
                .addressLine(req.addressLine())
                .city(req.city())
                .state(req.state())
                .postalCode(req.postalCode())
                .contactPhone(req.contactPhone())
                .totalStalls(req.totalStalls())
                .status(req.status() == null ? FoodCourtStatus.ACTIVE : req.status())
                .notes(req.notes())
                .createdBy(actorUserId)
                .updatedBy(actorUserId)
                .build();
        fc = foodCourtRepository.save(fc);
        auditService.record(fc.getId(), AuditAction.CREATE, "FOOD_COURT", fc.getId(), actorUserId,
                "Created food court " + fc.getName());
        return FoodCourtMappers.toResponse(fc, stallRepository, stallLeaseRepository);
    }

    @Transactional
    public FoodCourtResponse update(UUID id, FoodCourtRequest req, String actorUserId) {
        FoodCourt fc = requireFoodCourt(id);
        String code = normaliseCode(req.code());
        foodCourtRepository.findActiveByCode(code)
                .filter(other -> !other.getId().equals(id))
                .ifPresent(other -> {
                    throw new FoodCourtValidationException("food_court_code_already_exists");
                });
        fc.setCode(code);
        fc.setName(req.name().trim());
        fc.setAddressLine(req.addressLine());
        fc.setCity(req.city());
        fc.setState(req.state());
        fc.setPostalCode(req.postalCode());
        fc.setContactPhone(req.contactPhone());
        fc.setTotalStalls(req.totalStalls());
        if (req.status() != null) {
            fc.setStatus(req.status());
        }
        fc.setNotes(req.notes());
        fc.setUpdatedBy(actorUserId);
        fc = foodCourtRepository.save(fc);
        auditService.record(fc.getId(), AuditAction.UPDATE, "FOOD_COURT", fc.getId(), actorUserId,
                "Updated food court " + fc.getName());
        return FoodCourtMappers.toResponse(fc, stallRepository, stallLeaseRepository);
    }

    @Transactional
    public void delete(UUID id, String actorUserId) {
        FoodCourt fc = requireFoodCourt(id);
        fc.setDeletedAt(Instant.now());
        fc.setStatus(FoodCourtStatus.CLOSED);
        fc.setUpdatedBy(actorUserId);
        foodCourtRepository.save(fc);
        auditService.record(fc.getId(), AuditAction.DELETE, "FOOD_COURT", fc.getId(), actorUserId,
                "Archived food court " + fc.getName());
    }

    @Transactional(readOnly = true)
    public List<FoodCourtResponse> list(Optional<Set<UUID>> scope) {
        List<FoodCourt> courts = scope.isEmpty()
                ? foodCourtRepository.findAllActive()
                : foodCourtRepository.findAllActiveInScope(sentinel(scope.get()));
        return courts.stream()
                .map(fc -> FoodCourtMappers.toResponse(fc, stallRepository, stallLeaseRepository))
                .toList();
    }

    @Transactional(readOnly = true)
    public FoodCourtResponse getById(UUID id) {
        return FoodCourtMappers.toResponse(requireFoodCourt(id), stallRepository, stallLeaseRepository);
    }

    @Transactional(readOnly = true)
    public FoodCourtDashboardResponse dashboard(UUID id) {
        LocalDate today = BusinessTime.today();
        return dashboard(id, today.getYear(), today.getMonthValue());
    }

    @Transactional(readOnly = true)
    public FoodCourtDashboardResponse dashboard(UUID id, int year, int month) {
        FoodCourt fc = requireFoodCourt(id);
        long totalStalls = stallRepository.countActiveByFoodCourt(id);
        List<StallLease> activeLeases = stallLeaseRepository.findByFoodCourtAndStatus(id, LeaseStatus.ACTIVE);
        long occupied = activeLeases.stream().map(StallLease::getStallId).distinct().count();
        long vacant = Math.max(0, totalStalls - occupied);
        long activeTenants = activeLeases.stream().map(StallLease::getTenantId).distinct().count();
        BigDecimal contractedRent = activeLeases.stream()
                .map(StallLease::getMonthlyRent)
                .filter(v -> v != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal occupancyRate = totalStalls == 0
                ? BigDecimal.ZERO
                : BigDecimal.valueOf(occupied).multiply(BigDecimal.valueOf(100))
                        .divide(BigDecimal.valueOf(totalStalls), 2, RoundingMode.HALF_UP);
        LocalDate from = LocalDate.of(year, month, 1);
        LocalDate to = from.withDayOfMonth(from.lengthOfMonth());
        BigDecimal landlordLease = propertyLeaseRepository.findByFoodCourt(id).stream()
                .filter(lease -> lease.getStatus() == LeaseStatus.ACTIVE)
                .map(lease -> lease.getMonthlyRent() == null ? BigDecimal.ZERO : lease.getMonthlyRent())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal expenses = nz(expenseRepository.sumByFoodCourtAndRange(id, from, to));
        BigDecimal grossSpread = contractedRent.subtract(landlordLease);
        return new FoodCourtDashboardResponse(
                fc.getId(), fc.getName(), totalStalls, occupied, vacant, occupancyRate,
                activeLeases.size(), activeTenants, contractedRent,
                nz(depositRepository.sumHeldByFoodCourt(id)),
                nz(rentInvoiceRepository.sumOutstandingByFoodCourt(id)),
                actionItemRepository.countOpenByFoodCourt(id),
                year, month,
                nz(rentInvoiceRepository.sumBilledForPeriod(id, year, month)),
                nz(rentInvoiceRepository.sumCollectedForPeriod(id, year, month)),
                landlordLease,
                grossSpread,
                expenses,
                grossSpread.subtract(expenses),
                rentInvoiceRepository.countOverdue(id, BusinessTime.today()));
    }

    @Transactional(readOnly = true)
    public FoodCourtFinancialReportResponse financialReport(UUID id, int year, int month) {
        FoodCourt fc = requireFoodCourt(id);
        if (month < 1 || month > 12) {
            throw new FoodCourtValidationException("month_must_be_between_1_and_12");
        }
        LocalDate from = LocalDate.of(year, month, 1);
        LocalDate to = from.withDayOfMonth(from.lengthOfMonth());
        BigDecimal billed = nz(rentInvoiceRepository.sumBilledForPeriod(id, year, month));
        BigDecimal collected = nz(rentInvoiceRepository.sumCollectedForPeriod(id, year, month));
        BigDecimal outstanding = nz(rentInvoiceRepository.sumOutstandingByFoodCourt(id));
        BigDecimal expenses = nz(expenseRepository.sumByFoodCourtAndRange(id, from, to));
        BigDecimal deposits = nz(depositRepository.sumHeldByFoodCourt(id));
        BigDecimal net = collected.subtract(expenses);
        return new FoodCourtFinancialReportResponse(
                fc.getId(), fc.getName(), year, month,
                billed, collected, outstanding, expenses, deposits, net);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    FoodCourt requireFoodCourt(UUID id) {
        return foodCourtRepository.findActiveById(id)
                .orElseThrow(() -> new FoodCourtNotFoundException("food_court_not_found: " + id));
    }

    private String normaliseCode(String code) {
        return code == null ? null : code.trim().toUpperCase();
    }

    private Set<UUID> sentinel(Set<UUID> ids) {
        return ids.isEmpty() ? Set.of(new UUID(0L, 0L)) : ids;
    }

    private BigDecimal nz(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }
}
