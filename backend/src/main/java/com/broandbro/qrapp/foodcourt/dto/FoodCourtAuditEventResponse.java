package com.broandbro.qrapp.foodcourt.dto;

import com.broandbro.qrapp.foodcourt.enums.AuditAction;

import java.time.Instant;
import java.util.UUID;

/** Audit trail entry view. */
public record FoodCourtAuditEventResponse(
        UUID id,
        UUID foodCourtId,
        AuditAction action,
        String entityType,
        UUID entityId,
        String actorUserId,
        String summary,
        Instant occurredAt
) {}
