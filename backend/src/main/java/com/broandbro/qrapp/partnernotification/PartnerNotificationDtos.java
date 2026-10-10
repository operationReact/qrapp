package com.broandbro.qrapp.partnernotification;

import java.time.Instant;

public final class PartnerNotificationDtos {
    private PartnerNotificationDtos() {
    }

    public record NotificationResponse(Long id, PartnerNotificationType eventType, String title, String message,
                                       String targetPath, Long entityId, boolean read, Instant readAt,
                                       Instant createdAt) {
        public static NotificationResponse from(PartnerNotification n) {
            return new NotificationResponse(n.getId(), n.getEventType(), n.getTitle(), n.getMessage(),
                    n.getTargetPath(), n.getEntityId(), n.getReadAt() != null, n.getReadAt(), n.getCreatedAt());
        }
    }

    public record UnreadCountResponse(long unread) {
    }

    public record MarkAllReadResponse(int updated) {
    }
}
