package com.broandbro.qrapp.dto.partyorder;

import com.broandbro.qrapp.entity.PartyOrder;
import com.broandbro.qrapp.enums.PartyOrderStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;

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
        /** Structured menu items (replaces the old menuDescription string). */
        List<String> menuItems,
        String venue,
        String eventType,
        String specialNotes,
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

    /** Extracts item names from the entity's menuItems collection. */
    private static List<String> extractMenuItems(PartyOrder po) {
        if (po.getMenuItems() == null || po.getMenuItems().isEmpty()) {
            // Backward-compat: fall back to splitting the legacy text field
            if (po.getMenuDescription() != null && !po.getMenuDescription().isBlank()) {
                return List.of(po.getMenuDescription().split(","))
                        .stream()
                        .map(String::trim)
                        .filter(s -> !s.isEmpty())
                        .toList();
            }
            return List.of();
        }
        return po.getMenuItems().stream()
                .map(item -> item.getItemName())
                .toList();
    }

    /** Build from entity for user-facing responses (strips PII). */
    public static PartyOrderResponse forUser(PartyOrder po) {
        return new PartyOrderResponse(
                po.getId(), po.getUserId(), null, null,
                po.getEventDateTime(), po.getNumberOfPeople(),
                extractMenuItems(po),
                po.getVenue(), po.getEventType(), po.getSpecialNotes(),
                po.getStatus(), po.getEstimatedAmount(), po.getCurrency(),
                po.getEstimateNote(), po.getEstimateSubmittedBy(),
                po.getEstimateSentAt(), po.getUserRespondedAt(),
                po.getCreatedAt(), po.getUpdatedAt()
        );
    }

    /** Build from entity for admin responses (includes PII). */
    public static PartyOrderResponse forAdmin(PartyOrder po) {
        return new PartyOrderResponse(
                po.getId(), po.getUserId(), po.getUserPhone(), po.getUserName(),
                po.getEventDateTime(), po.getNumberOfPeople(),
                extractMenuItems(po),
                po.getVenue(), po.getEventType(), po.getSpecialNotes(),
                po.getStatus(), po.getEstimatedAmount(), po.getCurrency(),
                po.getEstimateNote(), po.getEstimateSubmittedBy(),
                po.getEstimateSentAt(), po.getUserRespondedAt(),
                po.getCreatedAt(), po.getUpdatedAt()
        );
    }
}
