package com.broandbro.qrapp.foodcourt.audit;

import com.broandbro.qrapp.foodcourt.entity.FoodCourtAuditEvent;
import com.broandbro.qrapp.foodcourt.enums.AuditAction;
import com.broandbro.qrapp.foodcourt.repository.FoodCourtAuditEventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.UUID;

/**
 * Records append-only audit events for significant food court actions
 * (financial transactions, status changes, access grants). Audit rows are
 * never updated or deleted, preserving the full change history.
 */
@Service
@RequiredArgsConstructor
public class FoodCourtAuditService {

    private final FoodCourtAuditEventRepository repository;

    public void record(UUID foodCourtId, AuditAction action, String entityType, UUID entityId,
                       String actorUserId, String summary) {
        FoodCourtAuditEvent event = FoodCourtAuditEvent.builder()
                .foodCourtId(foodCourtId)
                .action(action)
                .entityType(entityType)
                .entityId(entityId)
                .actorUserId(actorUserId)
                .summary(summary)
                .occurredAt(Instant.now())
                .createdBy(actorUserId)
                .updatedBy(actorUserId)
                .build();
        repository.save(event);
    }
}
