package com.broandbro.qrapp.foodcourt.service;

import com.broandbro.qrapp.foodcourt.dto.StallRequest;
import com.broandbro.qrapp.foodcourt.dto.StallResponse;
import com.broandbro.qrapp.foodcourt.entity.Stall;
import com.broandbro.qrapp.foodcourt.entity.StallLease;
import com.broandbro.qrapp.foodcourt.entity.Tenant;
import com.broandbro.qrapp.foodcourt.enums.AuditAction;
import com.broandbro.qrapp.foodcourt.enums.StallStatus;
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

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Stall CRUD. Occupancy and current-tenant details are never stored on the
 * stall; they are derived at read time from the active {@link StallLease}
 * covering today.
 */
@Service
@RequiredArgsConstructor
public class StallService {

    private final StallRepository stallRepository;
    private final StallLeaseRepository stallLeaseRepository;
    private final TenantRepository tenantRepository;
    private final FoodCourtRepository foodCourtRepository;
    private final FoodCourtAuditService auditService;

    @Transactional
    public StallResponse create(UUID foodCourtId, StallRequest req, String actorUserId) {
        requireFoodCourt(foodCourtId);
        String code = req.code().trim();
        if (stallRepository.existsActiveByFoodCourtAndCode(foodCourtId, code)) {
            throw new FoodCourtValidationException("stall_code_already_exists");
        }
        Stall stall = Stall.builder()
                .foodCourtId(foodCourtId)
                .code(code)
                .name(req.name())
                .floor(req.floor())
                .areaSqft(req.areaSqft())
                .baseRent(req.baseRent())
                .status(req.status() == null ? StallStatus.AVAILABLE : req.status())
                .notes(req.notes())
                .createdBy(actorUserId)
                .updatedBy(actorUserId)
                .build();
        stall = stallRepository.save(stall);
        auditService.record(foodCourtId, AuditAction.CREATE, "STALL", stall.getId(), actorUserId,
                "Created stall " + stall.getCode());
        return toResponse(stall);
    }

    @Transactional
    public StallResponse update(UUID foodCourtId, UUID stallId, StallRequest req, String actorUserId) {
        Stall stall = requireStall(foodCourtId, stallId);
        String code = req.code().trim();
        if (!stall.getCode().equalsIgnoreCase(code)
                && stallRepository.existsActiveByFoodCourtAndCode(foodCourtId, code)) {
            throw new FoodCourtValidationException("stall_code_already_exists");
        }
        stall.setCode(code);
        stall.setName(req.name());
        stall.setFloor(req.floor());
        stall.setAreaSqft(req.areaSqft());
        stall.setBaseRent(req.baseRent());
        if (req.status() != null) {
            stall.setStatus(req.status());
        }
        stall.setNotes(req.notes());
        stall.setUpdatedBy(actorUserId);
        stall = stallRepository.save(stall);
        auditService.record(foodCourtId, AuditAction.UPDATE, "STALL", stall.getId(), actorUserId,
                "Updated stall " + stall.getCode());
        return toResponse(stall);
    }

    @Transactional
    public void delete(UUID foodCourtId, UUID stallId, String actorUserId) {
        Stall stall = requireStall(foodCourtId, stallId);
        if (!stallLeaseRepository.findActiveLeasesForStallOn(stallId, BusinessTime.today()).isEmpty()) {
            throw new FoodCourtValidationException("stall_has_active_lease");
        }
        stall.setDeletedAt(Instant.now());
        stall.setStatus(StallStatus.VACANT);
        stall.setUpdatedBy(actorUserId);
        stallRepository.save(stall);
        auditService.record(foodCourtId, AuditAction.DELETE, "STALL", stall.getId(), actorUserId,
                "Retired stall " + stall.getCode());
    }

    @Transactional(readOnly = true)
    public List<StallResponse> list(UUID foodCourtId) {
        requireFoodCourt(foodCourtId);
        return stallRepository.findActiveByFoodCourt(foodCourtId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public StallResponse getById(UUID foodCourtId, UUID stallId) {
        return toResponse(requireStall(foodCourtId, stallId));
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    StallResponse toResponse(Stall stall) {
        LocalDate today = BusinessTime.today();
        List<StallLease> active = stallLeaseRepository.findActiveLeasesForStallOn(stall.getId(), today);
        StallLease lease = active.isEmpty() ? null : active.get(0);
        String tenantName = null;
        if (lease != null) {
            tenantName = tenantRepository.findActiveById(lease.getTenantId())
                    .map(Tenant::getName)
                    .orElse(null);
        }
        return new StallResponse(
                stall.getId(), stall.getFoodCourtId(), stall.getCode(), stall.getName(),
                stall.getFloor(), stall.getAreaSqft(), stall.getBaseRent(), stall.getStatus(),
                lease != null,
                lease != null ? lease.getId() : null,
                lease != null ? lease.getTenantId() : null,
                tenantName,
                lease != null ? lease.getMonthlyRent() : null,
                stall.getNotes());
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
}
