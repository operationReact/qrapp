package com.broandbro.qrapp.partnerfinance.repository;

import com.broandbro.qrapp.partnerfinance.entity.PartnerFinanceAudit;
import com.broandbro.qrapp.partnerfinance.enums.FinanceEntityType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PartnerFinanceAuditRepository extends JpaRepository<PartnerFinanceAudit, Long> {
    List<PartnerFinanceAudit> findByPartnerIdAndEntityTypeAndEntityIdOrderByCreatedAtAscIdAsc(
            Long partnerId, FinanceEntityType entityType, Long entityId);
}