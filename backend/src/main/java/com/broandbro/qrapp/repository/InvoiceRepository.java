package com.broandbro.qrapp.repository;

import com.broandbro.qrapp.entity.Invoice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

public interface InvoiceRepository extends JpaRepository<Invoice, Long> {
    Optional<Invoice> findByOrderId(Long orderId);
    @Query(value = "SELECT nextval('invoice_number_seq')", nativeQuery = true)
    Long nextNumber();
}
