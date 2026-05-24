package com.broandbro.qrapp.dto.partyorder;

import com.broandbro.qrapp.entity.PartyOrder;
import com.broandbro.qrapp.enums.PartyOrderStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;

/**
 * Shared response DTO for both user-facing and admin-facing party order APIs.
 * The {@code userPhone} and {@code userName} fields are populated only for
 * admin responses — they are omitted from user-facing responses for privacy.
 */
public record PartyOrderResponse(
        Long id,
        Long userId,
        String userPhone,
        String userName,
        LocalDateTime eventDateTime,
        Integer numberOfPeople,
        String menuDescription,
        String venue,
        PartyOrderStatus status,
        BigDecimal estimatedAmount,
        String currency,
        String estimateNote,
        String estimateSubmittedBy,
        Instant estimateSentAt,
        Instant userRespondedAt,
        Instant createdAt,
        Instant updatedAt
) {
    /** Build from entity for user-facing responses (strips PII). */
    public static PartyOrderResponse forUser(PartyOrder po) {
        return new PartyOrderResponse(
                po.getId(),
                po.getUserId(),
                null,   // hide phone from user-facing payload (user already knows it)
                null,
                po.getEventDateTime(),
                po.getNumberOfPeople(),
                po.getMenuDescription(),
                po.getVenue(),
                po.getStatus(),
                po.getEstimatedAmount(),
                po.getCurrency(),
                po.getEstimateNote(),
                po.getEstimateSubmittedBy(),
                po.getEstimateSentAt(),
                po.getUserRespondedAt(),
                po.getCreatedAt(),
                po.getUpdatedAt()
        );
    }

    /** Build from entity for admin responses (includes PII). */
    public static PartyOrderResponse forAdmin(PartyOrder po) {
        return new PartyOrderResponse(
                po.getId(),
                po.getUserId(),
                po.getUserPhone(),
                po.getUserName(),
                po.getEventDateTime(),
                po.getNumberOfPeople(),
                po.getMenuDescription(),
                po.getVenue(),
                po.getStatus(),
                po.getEstimatedAmount(),
                po.getCurrency(),
                po.getEstimateNote(),
                po.getEstimateSubmittedBy(),
                po.getEstimateSentAt(),
                po.getUserRespondedAt(),
                po.getCreatedAt(),
                po.getUpdatedAt()
        );
    }
}

