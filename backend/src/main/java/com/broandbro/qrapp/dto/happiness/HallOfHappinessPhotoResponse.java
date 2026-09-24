package com.broandbro.qrapp.dto.happiness;

import com.broandbro.qrapp.entity.HallOfHappinessPhoto;
import java.time.Instant;
import java.time.LocalDateTime;

public record HallOfHappinessPhotoResponse(
        Long id,
        Long orderId,
        String eventType,
        LocalDateTime eventDateTime,
        String imageUrl,
        String thumbnailUrl,
        String caption,
        String status,
        String consentStatus,
        Integer displayOrder,
        String customerName,
        String customerPhone,
        Instant createdAt,
        Instant publishedAt
) {
    public static HallOfHappinessPhotoResponse forCustomer(HallOfHappinessPhoto photo) {
        return create(photo, null, null);
    }

    public static HallOfHappinessPhotoResponse forAdmin(HallOfHappinessPhoto photo) {
        return create(photo, photo.getPartyOrder().getUserName(), photo.getPartyOrder().getUserPhone());
    }

    private static HallOfHappinessPhotoResponse create(
            HallOfHappinessPhoto photo, String customerName, String customerPhone) {
        return new HallOfHappinessPhotoResponse(
                photo.getId(),
                photo.getPartyOrder().getId(),
                photo.getPartyOrder().getEventType(),
                photo.getPartyOrder().getEventDateTime(),
                photo.getImageUrl(),
                photo.getThumbnailUrl(),
                photo.getCaption(),
                photo.getStatus().name(),
                photo.getConsentStatus().name(),
                photo.getDisplayOrder(),
                customerName,
                customerPhone,
                photo.getCreatedAt(),
                photo.getPublishedAt());
    }
}
