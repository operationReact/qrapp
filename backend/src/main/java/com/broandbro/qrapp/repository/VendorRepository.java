package com.broandbro.qrapp.repository;

import com.broandbro.qrapp.entity.Vendor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface VendorRepository extends JpaRepository<Vendor, Long> {
    Optional<Vendor> findByPhoneNumber(String phoneNumber);

    @Query("select count(vl) > 0 from VendorLocation vl where vl.vendor.id = :vendorId and vl.location.id = :locationId")
    boolean isLinkedToLocation(@Param("vendorId") Long vendorId, @Param("locationId") Long locationId);
}
