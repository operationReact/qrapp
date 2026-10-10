package com.broandbro.qrapp.manualinvoice.service;

import com.broandbro.qrapp.manualinvoice.entity.ManualInvoiceAudit;
import com.broandbro.qrapp.manualinvoice.enums.ManualInvoiceStatus;
import com.broandbro.qrapp.manualinvoice.repository.ManualInvoiceAuditRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** Writes manual invoice audit rows inside the caller's transaction. */
@Service
@RequiredArgsConstructor
public class ManualInvoiceAuditService {
    private final ManualInvoiceAuditRepository repository;

    @Transactional(propagation = Propagation.MANDATORY)
    public void record(Long invoiceId, String action, ManualInvoiceActor actor,
                       ManualInvoiceStatus previous, ManualInvoiceStatus next, String reason) {
        repository.save(ManualInvoiceAudit.builder()
                .manualInvoiceId(invoiceId)
                .action(action)
                .actorUserId(actor == null ? null : actor.userId())
                .actorName(actor == null ? null : actor.name())
                .actorRole(actor == null ? null : actor.role())
                .previousStatus(previous == null ? null : previous.name())
                .newStatus(next == null ? null : next.name())
                .reason(reason)
                .build());
    }
}
