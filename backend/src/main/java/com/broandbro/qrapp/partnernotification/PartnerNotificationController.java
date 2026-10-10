package com.broandbro.qrapp.partnernotification;

import com.broandbro.qrapp.partnernotification.PartnerNotificationDtos.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

/** Per-user notification inbox; available to PARTNER_ADMIN and PARTNER_USER for their own notifications only. */
@RestController
@RequestMapping("/api/v1/partner/notifications")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('PARTNER_ADMIN', 'PARTNER_USER')")
public class PartnerNotificationController {
    private final PartnerNotificationService service;

    @GetMapping
    public Page<NotificationResponse> list(@RequestParam(defaultValue = "false") boolean unreadOnly,
                                           @RequestParam(defaultValue = "0") int page,
                                           @RequestParam(defaultValue = "20") int size,
                                           Authentication authentication) {
        return service.list(authentication, unreadOnly, page, size);
    }

    @GetMapping("/unread-count")
    public UnreadCountResponse unreadCount(Authentication authentication) {
        return service.unreadCount(authentication);
    }

    @PatchMapping("/{id}/read")
    public NotificationResponse markRead(@PathVariable Long id, Authentication authentication) {
        return service.markRead(authentication, id);
    }

    @PostMapping("/read-all")
    public MarkAllReadResponse markAllRead(Authentication authentication) {
        return service.markAllRead(authentication);
    }
}
