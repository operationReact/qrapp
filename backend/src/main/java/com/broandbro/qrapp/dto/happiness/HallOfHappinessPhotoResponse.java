package com.broandbro.qrapp.dto.happiness;

import com.broandbro.qrapp.entity.HallOfHappinessPhoto;
import java.time.Instant;
import java.time.LocalDateTime;

public record HallOfHappinessPhotoResponse(
        Long id,
        Long submissionId,
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
        Instant publishedAt,
        String sourceType,
        String eventLabel,
        String description,
        Long locationId,
        String locationName,
        boolean global
) {
    public static HallOfHappinessPhotoResponse forCustomer(HallOfHappinessPhoto photo) {
        return create(photo, null, null);
    }

    public static HallOfHappinessPhotoResponse forAdmin(HallOfHappinessPhoto photo) {
        String customerName = photo.getPartyOrder() == null ? null : photo.getPartyOrder().getUserName();
        String customerPhone = photo.getPartyOrder() == null ? null : photo.getPartyOrder().getUserPhone();
        return create(photo, customerName, customerPhone);
    }

    private static HallOfHappinessPhotoResponse create(
            HallOfHappinessPhoto photo, String customerName, String customerPhone) {
        return new HallOfHappinessPhotoResponse(
                photo.getId(),
                photo.getSubmission() == null ? null : photo.getSubmission().getId(),
                photo.getPartyOrder() == null ? null : photo.getPartyOrder().getId(),
                photo.getPartyOrder() == null ? null : photo.getPartyOrder().getEventType(),
                photo.getPartyOrder() == null ? null : photo.getPartyOrder().getEventDateTime(),
                photo.getImageUrl(),
                photo.getThumbnailUrl(),
                photo.getCaption(),
                photo.getStatus().name(),
                photo.getConsentStatus().name(),
                photo.getDisplayOrder(),
                customerName,
                customerPhone,
                photo.getCreatedAt(),
                photo.getPublishedAt(),
                photo.getSourceType().name(),
                photo.getEventLabel(),
                photo.getDescription(),
                photo.getLocation() == null ? null : photo.getLocation().getId(),
                photo.getLocation() == null ? null : photo.getLocation().getName(),
                photo.isGlobal());
    }
}
