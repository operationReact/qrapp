package com.broandbro.qrapp.manualinvoice.repository;

import com.broandbro.qrapp.manualinvoice.entity.ManualInvoice;
import com.broandbro.qrapp.manualinvoice.enums.ManualInvoiceSourceType;
import com.broandbro.qrapp.manualinvoice.enums.ManualInvoiceStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Optional;

public interface ManualInvoiceRepository extends JpaRepository<ManualInvoice, Long> {

    /**
     * Concurrency-safe global manual numbering, deliberately a different sequence
     * from the automatic {@code invoice_number_seq}.
     */
    @Query(value = "SELECT nextval('manual_invoice_number_seq')", nativeQuery = true)
    Long nextManualNumber();

    boolean existsBySourceTypeAndLinkedOrderIdAndStatusNot(
            ManualInvoiceSourceType sourceType, Long linkedOrderId, ManualInvoiceStatus status);

    Optional<ManualInvoice> findByInvoiceNumber(String invoiceNumber);

    @Query("""
            SELECT mi FROM ManualInvoice mi
            WHERE (:status IS NULL OR mi.status = :status)
              AND (:sourceType IS NULL OR mi.sourceType = :sourceType)
              AND (:from IS NULL OR mi.invoiceDate >= :from)
              AND (:to IS NULL OR mi.invoiceDate <= :to)
              AND (CAST(:search AS string) IS NULL
                   OR LOWER(mi.customerName) LIKE LOWER(CONCAT('%', CAST(:search AS string), '%'))
                   OR (mi.invoiceNumber IS NOT NULL
                       AND LOWER(mi.invoiceNumber) LIKE LOWER(CONCAT('%', CAST(:search AS string), '%'))))
            ORDER BY mi.invoiceDate DESC, mi.id DESC
            """)
    Page<ManualInvoice> search(@Param("status") ManualInvoiceStatus status,
                               @Param("sourceType") ManualInvoiceSourceType sourceType,
                               @Param("from") LocalDate from,
                               @Param("to") LocalDate to,
                               @Param("search") String search,
                               Pageable pageable);
}
