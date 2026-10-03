package com.broandbro.qrapp.foodcourt.repository;

import com.broandbro.qrapp.foodcourt.entity.Stall;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface StallRepository extends JpaRepository<Stall, UUID> {

    @Query("SELECT s FROM Stall s WHERE s.deletedAt IS NULL AND s.id = :id")
    Optional<Stall> findActiveById(@Param("id") UUID id);

    @Query("SELECT s FROM Stall s WHERE s.deletedAt IS NULL AND s.foodCourtId = :foodCourtId ORDER BY s.code ASC")
    List<Stall> findActiveByFoodCourt(@Param("foodCourtId") UUID foodCourtId);

    @Query("SELECT COUNT(s) FROM Stall s WHERE s.deletedAt IS NULL AND s.foodCourtId = :foodCourtId")
    long countActiveByFoodCourt(@Param("foodCourtId") UUID foodCourtId);

    @Query("""
            SELECT (COUNT(s) > 0) FROM Stall s
            WHERE s.deletedAt IS NULL AND s.foodCourtId = :foodCourtId
              AND lower(s.code) = lower(:code)
            """)
    boolean existsActiveByFoodCourtAndCode(@Param("foodCourtId") UUID foodCourtId, @Param("code") String code);
}
