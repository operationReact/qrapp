package com.broandbro.qrapp.repository;

import com.broandbro.qrapp.entity.VendorLocation;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface VendorLocationRepository extends JpaRepository<VendorLocation, Long> {

    @EntityGraph(attributePaths = "vendor")
    List<VendorLocation> findByLocationIdOrderByVendorVendorNameAsc(Long locationId);

    @EntityGraph(attributePaths = "vendor")
    Optional<VendorLocation> findByVendorIdAndLocationId(Long vendorId, Long locationId);
}
