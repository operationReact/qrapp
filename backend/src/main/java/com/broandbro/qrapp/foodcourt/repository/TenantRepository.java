package com.broandbro.qrapp.foodcourt.repository;

import com.broandbro.qrapp.foodcourt.entity.Tenant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TenantRepository extends JpaRepository<Tenant, UUID> {

    @Query("SELECT t FROM Tenant t WHERE t.deletedAt IS NULL AND t.id = :id")
    Optional<Tenant> findActiveById(@Param("id") UUID id);

    @Query("SELECT t FROM Tenant t WHERE t.deletedAt IS NULL AND t.foodCourtId = :foodCourtId ORDER BY t.name ASC")
    List<Tenant> findActiveByFoodCourt(@Param("foodCourtId") UUID foodCourtId);
}
