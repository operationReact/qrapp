package com.broandbro.qrapp.foodcourt.repository;

import com.broandbro.qrapp.foodcourt.entity.PropertyLease;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PropertyLeaseRepository extends JpaRepository<PropertyLease, UUID> {

    Optional<PropertyLease> findByIdAndFoodCourtId(UUID id, UUID foodCourtId);

    @Query("SELECT p FROM PropertyLease p WHERE p.foodCourtId = :foodCourtId ORDER BY p.startDate DESC NULLS LAST")
    List<PropertyLease> findByFoodCourt(@Param("foodCourtId") UUID foodCourtId);
}
