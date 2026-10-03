package com.broandbro.qrapp.foodcourt.repository;

import com.broandbro.qrapp.foodcourt.entity.RentPayment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface RentPaymentRepository extends JpaRepository<RentPayment, UUID> {

    @Query("SELECT p FROM RentPayment p WHERE p.rentInvoiceId = :invoiceId ORDER BY p.paidAt ASC")
    List<RentPayment> findByInvoice(@Param("invoiceId") UUID invoiceId);

    @Query("SELECT p FROM RentPayment p WHERE p.foodCourtId = :foodCourtId ORDER BY p.paidAt DESC")
    List<RentPayment> findByFoodCourt(@Param("foodCourtId") UUID foodCourtId);
}
