package com.broandbro.qrapp.manualinvoice.repository;

import com.broandbro.qrapp.manualinvoice.entity.ManualInvoiceAudit;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ManualInvoiceAuditRepository extends JpaRepository<ManualInvoiceAudit, Long> {
    List<ManualInvoiceAudit> findByManualInvoiceIdOrderByCreatedAtDescIdDesc(Long manualInvoiceId);
}
