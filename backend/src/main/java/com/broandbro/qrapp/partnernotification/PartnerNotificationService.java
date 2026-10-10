package com.broandbro.qrapp.partnernotification;

import com.broandbro.qrapp.entity.PartnerUser;
import com.broandbro.qrapp.partnerfinance.entity.PartnerSettlement;
import com.broandbro.qrapp.partnerfinance.repository.PartnerSettlementRepository;
import com.broandbro.qrapp.partnernotification.PartnerNotificationDtos.*;
import com.broandbro.qrapp.partnerportal.PartnerPortalException;
import com.broandbro.qrapp.repository.PartnerUserRepository;
import com.broandbro.qrapp.service.PartnerAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

/**
 * Minimal in-app notifications. Rows are created only from settlement lifecycle events and are scoped to
 * the partner and the individual user; reading or marking them never touches finance data.
 */
@Service
@RequiredArgsConstructor
public class PartnerNotificationService {
    static final String SETTLEMENT_PATH = "/partner/finance/settlements/";

    private final PartnerAccessService access;
    private final PartnerNotificationRepository notifications;
    private final PartnerUserRepository partnerUsers;
    private final PartnerSettlementRepository settlements;

    /** Joins the settlement transaction; one row per active partner user, deduplicated by event key. */
    @Transactional(propagation = Propagation.MANDATORY)
    public void notifySettlementEvent(Long partnerId, Long settlementId, String action) {
        Optional<PartnerNotificationType> type = PartnerNotificationType.forSettlementAction(action);
        if (type.isEmpty()) return;
        Optional<PartnerSettlement> found = settlements.findByIdAndPartnerId(settlementId, partnerId);
        if (found.isEmpty()) return;
        String period = found.get().getPeriodStart().toString().substring(0, 7);
        String eventKey = "SETTLEMENT:" + settlementId + ":" + action;
        String path = SETTLEMENT_PATH + settlementId;
        String label = switch (type.get()) {
            case SETTLEMENT_CREATED -> "created";
            case SETTLEMENT_CALCULATED -> "calculated";
            case SETTLEMENT_APPROVED -> "approved";
            case SETTLEMENT_PAID -> "marked as paid";
        };
        for (PartnerUser recipient : partnerUsers.findByPartnerIdOrderByUser_NameAsc(partnerId)) {
            if (!Boolean.TRUE.equals(recipient.getActive())) continue;
            if (notifications.existsByPartnerIdAndPartnerUserIdAndEventKey(partnerId, recipient.getId(), eventKey)) {
                continue;
            }
            notifications.save(PartnerNotification.builder()
                    .partnerId(partnerId).partnerUserId(recipient.getId()).eventType(type.get())
                    .title("Settlement " + period + " " + label)
                    .message("The settlement for " + period + " was " + label + ".")
                    .targetPath(path).entityId(settlementId).eventKey(eventKey).build());
        }
    }

    @Transactional(readOnly = true)
    public Page<NotificationResponse> list(Authentication authentication, boolean unreadOnly, int page, int size) {
        PartnerUser me = access.currentAssociation(authentication);
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.min(Math.max(1, size), 100));
        Long partnerId = me.getPartner().getId();
        Page<PartnerNotification> result = unreadOnly
                ? notifications.findByPartnerIdAndPartnerUserIdAndReadAtIsNullOrderByCreatedAtDescIdDesc(
                        partnerId, me.getId(), pageable)
                : notifications.findByPartnerIdAndPartnerUserIdOrderByCreatedAtDescIdDesc(
                        partnerId, me.getId(), pageable);
        return result.map(NotificationResponse::from);
    }

    @Transactional(readOnly = true)
    public UnreadCountResponse unreadCount(Authentication authentication) {
        PartnerUser me = access.currentAssociation(authentication);
        return new UnreadCountResponse(notifications.countByPartnerIdAndPartnerUserIdAndReadAtIsNull(
                me.getPartner().getId(), me.getId()));
    }

    @Transactional
    public NotificationResponse markRead(Authentication authentication, Long id) {
        PartnerUser me = access.currentAssociation(authentication);
        PartnerNotification notification = notifications
                .findByIdAndPartnerIdAndPartnerUserId(id, me.getPartner().getId(), me.getId())
                .orElseThrow(() -> PartnerPortalException.notFound("notification_not_found"));
        if (notification.getReadAt() == null) {
            notification.setReadAt(Instant.now());
            notifications.save(notification);
        }
        return NotificationResponse.from(notification);
    }

    @Transactional
    public MarkAllReadResponse markAllRead(Authentication authentication) {
        PartnerUser me = access.currentAssociation(authentication);
        return new MarkAllReadResponse(notifications.markAllRead(me.getPartner().getId(), me.getId(), Instant.now()));
    }
}
