package com.broandbro.qrapp.repository;

import com.broandbro.qrapp.entity.VendorBill;
import com.broandbro.qrapp.enums.VendorBillStatus;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface VendorBillRepository extends JpaRepository<VendorBill, Long> {

    @Query(value = "SELECT nextval('vendor_bill_invoice_seq')", nativeQuery = true)
    Long nextInvoiceSequence();

    @EntityGraph(attributePaths = {"location", "vendorUser"})
    Optional<VendorBill> findByIdAndLocationId(Long id, Long locationId);

    @EntityGraph(attributePaths = {"location", "vendorUser"})
    List<VendorBill> findByLocationIdOrderByCreatedAtDesc(Long locationId);

    @EntityGraph(attributePaths = {"location", "vendorUser"})
    List<VendorBill> findByLocationIdAndStatusOrderByCreatedAtDesc(Long locationId, VendorBillStatus status);

    @EntityGraph(attributePaths = {"location", "vendorUser"})
    List<VendorBill> findByLocationIdAndVendorUserIdOrderByCreatedAtDesc(Long locationId, Long vendorUserId);
}
