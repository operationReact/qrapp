package com.broandbro.qrapp.foodcourt.service;

import com.broandbro.qrapp.foodcourt.dto.StallLeaseRequest;
import com.broandbro.qrapp.foodcourt.dto.StallLeaseResponse;
import com.broandbro.qrapp.foodcourt.entity.Stall;
import com.broandbro.qrapp.foodcourt.entity.StallLease;
import com.broandbro.qrapp.foodcourt.entity.Tenant;
import com.broandbro.qrapp.foodcourt.enums.AuditAction;
import com.broandbro.qrapp.foodcourt.enums.LeaseStatus;
import com.broandbro.qrapp.foodcourt.exception.FoodCourtConflictException;
import com.broandbro.qrapp.foodcourt.exception.FoodCourtNotFoundException;
import com.broandbro.qrapp.foodcourt.exception.FoodCourtValidationException;
import com.broandbro.qrapp.foodcourt.audit.FoodCourtAuditService;
import com.broandbro.qrapp.foodcourt.repository.FoodCourtRepository;
import com.broandbro.qrapp.foodcourt.repository.StallLeaseRepository;
import com.broandbro.qrapp.foodcourt.repository.StallRepository;
import com.broandbro.qrapp.foodcourt.repository.TenantRepository;
import com.broandbro.qrapp.time.BusinessTime;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Stall lease lifecycle. Enforces that no two {@link LeaseStatus#ACTIVE} leases
 * overlap on the same stall (so a stall is never double-booked), and derives
 * stall occupancy from the presence of such an active lease.
 */
@Service
@RequiredArgsConstructor
public class StallLeaseService {

    private static final int DEFAULT_RENT_DUE_DAY = 5;

    private final StallLeaseRepository leaseRepository;
    private final StallRepository stallRepository;
    private final TenantRepository tenantRepository;
    private final FoodCourtRepository foodCourtRepository;
    private final FoodCourtAuditService auditService;

    @Transactional
    public StallLeaseResponse create(UUID foodCourtId, StallLeaseRequest req, String actorUserId) {
        requireFoodCourt(foodCourtId);
        Stall stall = requireStall(foodCourtId, req.stallId());
        requireTenant(foodCourtId, req.tenantId());
        validateDates(req.startDate(), req.endDate());
        LeaseStatus status = req.status() == null ? LeaseStatus.ACTIVE : req.status();
        if (status == LeaseStatus.ACTIVE) {
            assertNoOverlap(stall.getId(), req.startDate(), req.endDate(), null);
        }
        StallLease lease = StallLease.builder()
                .foodCourtId(foodCourtId)
                .stallId(req.stallId())
                .tenantId(req.tenantId())
                .startDate(req.startDate())
                .endDate(req.endDate())
                .monthlyRent(req.monthlyRent())
                .depositAmount(req.depositAmount())
                .rentDueDay(normaliseDueDay(req.rentDueDay()))
                .paymentMethod(req.paymentMethod())
                .status(status)
                .notes(req.notes())
                .createdBy(actorUserId)
                .updatedBy(actorUserId)
                .build();
        lease = leaseRepository.save(lease);
        auditService.record(foodCourtId, AuditAction.CREATE, "STALL_LEASE", lease.getId(), actorUserId,
                "Created stall lease for stall " + stall.getCode());
        return toResponse(lease);
    }

    @Transactional
    public StallLeaseResponse update(UUID foodCourtId, UUID leaseId, StallLeaseRequest req, String actorUserId) {
        StallLease lease = requireLease(foodCourtId, leaseId);
        Stall stall = requireStall(foodCourtId, req.stallId());
        requireTenant(foodCourtId, req.tenantId());
        validateDates(req.startDate(), req.endDate());
        LeaseStatus status = req.status() == null ? lease.getStatus() : req.status();
        if (status == LeaseStatus.ACTIVE) {
            assertNoOverlap(req.stallId(), req.startDate(), req.endDate(), lease.getId());
        }
        lease.setStallId(req.stallId());
        lease.setTenantId(req.tenantId());
        lease.setStartDate(req.startDate());
        lease.setEndDate(req.endDate());
        lease.setMonthlyRent(req.monthlyRent());
        lease.setDepositAmount(req.depositAmount());
        lease.setRentDueDay(normaliseDueDay(req.rentDueDay()));
        lease.setPaymentMethod(req.paymentMethod());
        lease.setStatus(status);
        lease.setNotes(req.notes());
        lease.setUpdatedBy(actorUserId);
        lease = leaseRepository.save(lease);
        auditService.record(foodCourtId, AuditAction.UPDATE, "STALL_LEASE", lease.getId(), actorUserId,
                "Updated stall lease for stall " + stall.getCode());
        return toResponse(lease);
    }

    @Transactional
    public StallLeaseResponse terminate(UUID foodCourtId, UUID leaseId, LocalDate endDate, String actorUserId) {
        StallLease lease = requireLease(foodCourtId, leaseId);
        LocalDate effectiveEnd = endDate == null ? BusinessTime.today() : endDate;
        if (lease.getStartDate() != null && effectiveEnd.isBefore(lease.getStartDate())) {
            throw new FoodCourtValidationException("end_date_must_not_be_before_start_date");
        }
        lease.setStatus(LeaseStatus.TERMINATED);
        lease.setEndDate(effectiveEnd);
        lease.setUpdatedBy(actorUserId);
        lease = leaseRepository.save(lease);
        auditService.record(foodCourtId, AuditAction.STATUS_CHANGE, "STALL_LEASE", lease.getId(), actorUserId,
                "Terminated stall lease effective " + effectiveEnd);
        return toResponse(lease);
    }

    @Transactional(readOnly = true)
    public List<StallLeaseResponse> list(UUID foodCourtId) {
        requireFoodCourt(foodCourtId);
        return leaseRepository.findByFoodCourt(foodCourtId).stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public StallLeaseResponse getById(UUID foodCourtId, UUID leaseId) {
        return toResponse(requireLease(foodCourtId, leaseId));
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private void assertNoOverlap(UUID stallId, LocalDate start, LocalDate end, UUID excludeId) {
        List<StallLease> overlaps = leaseRepository.findOverlappingActiveLeases(stallId, start, end, excludeId);
        if (!overlaps.isEmpty()) {
            throw new FoodCourtConflictException("stall_has_overlapping_active_lease");
        }
    }

    private int normaliseDueDay(Integer rentDueDay) {
        if (rentDueDay == null) {
            return DEFAULT_RENT_DUE_DAY;
        }
        if (rentDueDay < 1 || rentDueDay > 28) {
            throw new FoodCourtValidationException("rent_due_day_must_be_between_1_and_28");
        }
        return rentDueDay;
    }

    private void validateDates(LocalDate start, LocalDate end) {
        if (start != null && end != null && end.isBefore(start)) {
            throw new FoodCourtValidationException("end_date_must_not_be_before_start_date");
        }
    }

    StallLeaseResponse toResponse(StallLease l) {
        String stallCode = stallRepository.findActiveById(l.getStallId()).map(Stall::getCode).orElse(null);
        String tenantName = tenantRepository.findActiveById(l.getTenantId()).map(Tenant::getName).orElse(null);
        return new StallLeaseResponse(
                l.getId(), l.getFoodCourtId(), l.getStallId(), stallCode, l.getTenantId(), tenantName,
                l.getStartDate(), l.getEndDate(), l.getMonthlyRent(), l.getDepositAmount(),
                l.getRentDueDay(), l.getPaymentMethod(), l.getStatus(), l.getNotes());
    }

    private void requireFoodCourt(UUID foodCourtId) {
        if (foodCourtRepository.findActiveById(foodCourtId).isEmpty()) {
            throw new FoodCourtNotFoundException("food_court_not_found: " + foodCourtId);
        }
    }

    private Stall requireStall(UUID foodCourtId, UUID stallId) {
        Stall stall = stallRepository.findActiveById(stallId)
                .orElseThrow(() -> new FoodCourtNotFoundException("stall_not_found: " + stallId));
        if (!stall.getFoodCourtId().equals(foodCourtId)) {
            throw new FoodCourtNotFoundException("stall_not_found_in_food_court: " + stallId);
        }
        return stall;
    }

    private Tenant requireTenant(UUID foodCourtId, UUID tenantId) {
        Tenant tenant = tenantRepository.findActiveById(tenantId)
                .orElseThrow(() -> new FoodCourtNotFoundException("tenant_not_found: " + tenantId));
        if (!tenant.getFoodCourtId().equals(foodCourtId)) {
            throw new FoodCourtNotFoundException("tenant_not_found_in_food_court: " + tenantId);
        }
        return tenant;
    }

    private StallLease requireLease(UUID foodCourtId, UUID leaseId) {
        return leaseRepository.findByIdAndFoodCourtId(leaseId, foodCourtId)
                .orElseThrow(() -> new FoodCourtNotFoundException("stall_lease_not_found: " + leaseId));
    }
}
