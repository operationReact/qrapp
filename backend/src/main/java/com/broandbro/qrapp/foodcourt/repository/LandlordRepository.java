package com.broandbro.qrapp.foodcourt.repository;

import com.broandbro.qrapp.foodcourt.entity.Landlord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface LandlordRepository extends JpaRepository<Landlord, UUID> {

    @Query("SELECT l FROM Landlord l WHERE l.deletedAt IS NULL AND l.id = :id")
    Optional<Landlord> findActiveById(@Param("id") UUID id);

    @Query("SELECT l FROM Landlord l WHERE l.deletedAt IS NULL AND l.foodCourtId = :foodCourtId ORDER BY l.name ASC")
    List<Landlord> findActiveByFoodCourt(@Param("foodCourtId") UUID foodCourtId);
}
