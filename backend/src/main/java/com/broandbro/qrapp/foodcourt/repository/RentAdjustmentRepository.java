package com.broandbro.qrapp.foodcourt.repository;

import com.broandbro.qrapp.foodcourt.entity.RentAdjustment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface RentAdjustmentRepository extends JpaRepository<RentAdjustment, UUID> {

    @Query("SELECT a FROM RentAdjustment a WHERE a.rentInvoiceId = :invoiceId ORDER BY a.createdAt ASC")
    List<RentAdjustment> findByInvoice(@Param("invoiceId") UUID invoiceId);
}
