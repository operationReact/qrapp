package com.broandbro.qrapp.partnerfinance.service;

import com.broandbro.qrapp.partnerfinance.entity.PartnerFinanceAudit;
import com.broandbro.qrapp.partnerfinance.enums.FinanceEntityType;
import com.broandbro.qrapp.partnerfinance.repository.PartnerFinanceAuditRepository;
import com.broandbro.qrapp.partnernotification.PartnerNotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class FinanceAuditService {
    private final PartnerFinanceAuditRepository repository;
    private final PartnerNotificationService notifications;

    /**
     * Joins the caller's transaction so an audit row exists if and only if the change committed. Settlement
     * CREATED/CALCULATED/APPROVED/PAID events also raise idempotent in-app notifications in that transaction.
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public void record(Long partnerId, FinanceEntityType type, Long entityId, String action, FinanceActor actor,
                       String previousValue, String newValue, String reason) {
        repository.save(PartnerFinanceAudit.builder()
                .partnerId(partnerId).entityType(type).entityId(entityId).action(action)
                .actorUserId(actor.userId()).actorName(actor.name()).actorRole(actor.role())
                .previousValue(previousValue).newValue(newValue).reason(reason)
                .build());
        if (type == FinanceEntityType.SETTLEMENT) {
            notifications.notifySettlementEvent(partnerId, entityId, action);
        }
    }
}