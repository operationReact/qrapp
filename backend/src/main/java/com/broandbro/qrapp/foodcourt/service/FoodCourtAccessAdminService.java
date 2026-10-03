package com.broandbro.qrapp.foodcourt.service;

import com.broandbro.qrapp.foodcourt.dto.FoodCourtAccessRequest;
import com.broandbro.qrapp.foodcourt.dto.FoodCourtAccessResponse;
import com.broandbro.qrapp.foodcourt.dto.FoodCourtAuditEventResponse;
import com.broandbro.qrapp.foodcourt.entity.FoodCourtAccess;
import com.broandbro.qrapp.foodcourt.entity.FoodCourtAuditEvent;
import com.broandbro.qrapp.foodcourt.enums.AuditAction;
import com.broandbro.qrapp.foodcourt.enums.FoodCourtAccessStatus;
import com.broandbro.qrapp.foodcourt.exception.FoodCourtNotFoundException;
import com.broandbro.qrapp.foodcourt.audit.FoodCourtAuditService;
import com.broandbro.qrapp.foodcourt.repository.FoodCourtAccessRepository;
import com.broandbro.qrapp.foodcourt.repository.FoodCourtAuditEventRepository;
import com.broandbro.qrapp.foodcourt.repository.FoodCourtRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Manages per-food-court access grants (keyed by opaque user id) and exposes
 * the food court audit trail. Access grants drive the server-side scoping in
 * {@link com.broandbro.qrapp.foodcourt.security.FoodCourtAccessService}.
 */
@Service
@RequiredArgsConstructor
public class FoodCourtAccessAdminService {

    private final FoodCourtAccessRepository accessRepository;
    private final FoodCourtAuditEventRepository auditEventRepository;
    private final FoodCourtRepository foodCourtRepository;
    private final FoodCourtAuditService auditService;

    @Transactional
    public FoodCourtAccessResponse grant(UUID foodCourtId, FoodCourtAccessRequest req, String actorUserId) {
        requireFoodCourt(foodCourtId);
        FoodCourtAccess access = accessRepository
                .findByFoodCourtIdAndUserId(foodCourtId, req.userId().trim())
                .orElseGet(() -> FoodCourtAccess.builder()
                        .foodCourtId(foodCourtId)
                        .userId(req.userId().trim())
                        .createdBy(actorUserId)
                        .build());
        access.setRole(req.role());
        access.setStatus(FoodCourtAccessStatus.ACTIVE);
        access.setUpdatedBy(actorUserId);
        access = accessRepository.save(access);
        auditService.record(foodCourtId, AuditAction.ACCESS_GRANTED, "FOOD_COURT_ACCESS", access.getId(),
                actorUserId, "Granted " + req.role() + " to " + req.userId());
        return toResponse(access);
    }

    @Transactional
    public void revoke(UUID foodCourtId, UUID accessId, String actorUserId) {
        FoodCourtAccess access = accessRepository.findById(accessId)
                .filter(a -> a.getFoodCourtId().equals(foodCourtId))
                .orElseThrow(() -> new FoodCourtNotFoundException("access_grant_not_found: " + accessId));
        access.setStatus(FoodCourtAccessStatus.REVOKED);
        access.setUpdatedBy(actorUserId);
        accessRepository.save(access);
        auditService.record(foodCourtId, AuditAction.ACCESS_REVOKED, "FOOD_COURT_ACCESS", access.getId(),
                actorUserId, "Revoked access for " + access.getUserId());
    }

    @Transactional(readOnly = true)
    public List<FoodCourtAccessResponse> list(UUID foodCourtId) {
        requireFoodCourt(foodCourtId);
        return accessRepository.findByFoodCourtAndStatus(foodCourtId, FoodCourtAccessStatus.ACTIVE).stream()
                .map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<FoodCourtAuditEventResponse> auditTrail(UUID foodCourtId, int page, int size) {
        requireFoodCourt(foodCourtId);
        return auditEventRepository
                .findByFoodCourtIdOrderByOccurredAtDesc(foodCourtId, PageRequest.of(page, size))
                .map(this::toResponse)
                .getContent();
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    FoodCourtAccessResponse toResponse(FoodCourtAccess a) {
        return new FoodCourtAccessResponse(
                a.getId(), a.getFoodCourtId(), a.getUserId(), a.getRole(), a.getStatus(), a.getCreatedAt());
    }

    FoodCourtAuditEventResponse toResponse(FoodCourtAuditEvent e) {
        return new FoodCourtAuditEventResponse(
                e.getId(), e.getFoodCourtId(), e.getAction(), e.getEntityType(), e.getEntityId(),
                e.getActorUserId(), e.getSummary(), e.getOccurredAt());
    }

    private void requireFoodCourt(UUID foodCourtId) {
        if (foodCourtRepository.findActiveById(foodCourtId).isEmpty()) {
            throw new FoodCourtNotFoundException("food_court_not_found: " + foodCourtId);
        }
    }
}
