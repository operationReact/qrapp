package com.broandbro.qrapp.foodcourt.service;

import com.broandbro.qrapp.foodcourt.dto.TenantRequest;
import com.broandbro.qrapp.foodcourt.dto.TenantResponse;
import com.broandbro.qrapp.foodcourt.entity.Tenant;
import com.broandbro.qrapp.foodcourt.enums.AuditAction;
import com.broandbro.qrapp.foodcourt.enums.TenantStatus;
import com.broandbro.qrapp.foodcourt.exception.FoodCourtNotFoundException;
import com.broandbro.qrapp.foodcourt.audit.FoodCourtAuditService;
import com.broandbro.qrapp.foodcourt.repository.FoodCourtRepository;
import com.broandbro.qrapp.foodcourt.repository.TenantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Tenant CRUD scoped to a food court. */
@Service
@RequiredArgsConstructor
public class TenantService {

    private final TenantRepository tenantRepository;
    private final FoodCourtRepository foodCourtRepository;
    private final FoodCourtAuditService auditService;

    @Transactional
    public TenantResponse create(UUID foodCourtId, TenantRequest req, String actorUserId) {
        requireFoodCourt(foodCourtId);
        Tenant tenant = Tenant.builder()
                .foodCourtId(foodCourtId)
                .name(req.name().trim())
                .businessName(req.businessName())
                .contactPhone(req.contactPhone())
                .contactEmail(req.contactEmail())
                .userId(req.userId())
                .status(req.status() == null ? TenantStatus.ACTIVE : req.status())
                .notes(req.notes())
                .createdBy(actorUserId)
                .updatedBy(actorUserId)
                .build();
        tenant = tenantRepository.save(tenant);
        auditService.record(foodCourtId, AuditAction.CREATE, "TENANT", tenant.getId(), actorUserId,
                "Created tenant " + tenant.getName());
        return toResponse(tenant);
    }

    @Transactional
    public TenantResponse update(UUID foodCourtId, UUID tenantId, TenantRequest req, String actorUserId) {
        Tenant tenant = requireTenant(foodCourtId, tenantId);
        tenant.setName(req.name().trim());
        tenant.setBusinessName(req.businessName());
        tenant.setContactPhone(req.contactPhone());
        tenant.setContactEmail(req.contactEmail());
        tenant.setUserId(req.userId());
        if (req.status() != null) {
            tenant.setStatus(req.status());
        }
        tenant.setNotes(req.notes());
        tenant.setUpdatedBy(actorUserId);
        tenant = tenantRepository.save(tenant);
        auditService.record(foodCourtId, AuditAction.UPDATE, "TENANT", tenant.getId(), actorUserId,
                "Updated tenant " + tenant.getName());
        return toResponse(tenant);
    }

    @Transactional
    public void delete(UUID foodCourtId, UUID tenantId, String actorUserId) {
        Tenant tenant = requireTenant(foodCourtId, tenantId);
        tenant.setDeletedAt(Instant.now());
        tenant.setStatus(TenantStatus.INACTIVE);
        tenant.setUpdatedBy(actorUserId);
        tenantRepository.save(tenant);
        auditService.record(foodCourtId, AuditAction.DELETE, "TENANT", tenant.getId(), actorUserId,
                "Deactivated tenant " + tenant.getName());
    }

    @Transactional(readOnly = true)
    public List<TenantResponse> list(UUID foodCourtId) {
        requireFoodCourt(foodCourtId);
        return tenantRepository.findActiveByFoodCourt(foodCourtId).stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public TenantResponse getById(UUID foodCourtId, UUID tenantId) {
        return toResponse(requireTenant(foodCourtId, tenantId));
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    TenantResponse toResponse(Tenant t) {
        return new TenantResponse(
                t.getId(), t.getFoodCourtId(), t.getName(), t.getBusinessName(),
                t.getContactPhone(), t.getContactEmail(), t.getUserId(), t.getStatus(), t.getNotes());
    }

    private void requireFoodCourt(UUID foodCourtId) {
        if (foodCourtRepository.findActiveById(foodCourtId).isEmpty()) {
            throw new FoodCourtNotFoundException("food_court_not_found: " + foodCourtId);
        }
    }

    private Tenant requireTenant(UUID foodCourtId, UUID tenantId) {
        Tenant tenant = tenantRepository.findActiveById(tenantId)
                .orElseThrow(() -> new FoodCourtNotFoundException("tenant_not_found: " + tenantId));
        if (!tenant.getFoodCourtId().equals(foodCourtId)) {
            throw new FoodCourtNotFoundException("tenant_not_found_in_food_court: " + tenantId);
        }
        return tenant;
    }
}
