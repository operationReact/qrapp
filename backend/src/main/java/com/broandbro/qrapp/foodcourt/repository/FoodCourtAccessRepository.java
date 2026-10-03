package com.broandbro.qrapp.foodcourt.repository;

import com.broandbro.qrapp.foodcourt.entity.FoodCourtAccess;
import com.broandbro.qrapp.foodcourt.enums.FoodCourtAccessStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FoodCourtAccessRepository extends JpaRepository<FoodCourtAccess, UUID> {

    Optional<FoodCourtAccess> findByFoodCourtIdAndUserId(UUID foodCourtId, String userId);

    @Query("""
            SELECT a.foodCourtId FROM FoodCourtAccess a
            WHERE a.userId = :userId AND a.status = com.broandbro.qrapp.foodcourt.enums.FoodCourtAccessStatus.ACTIVE
            """)
    List<UUID> findAccessibleFoodCourtIds(@Param("userId") String userId);

    @Query("SELECT a FROM FoodCourtAccess a WHERE a.foodCourtId = :foodCourtId AND a.status = :status ORDER BY a.createdAt ASC")
    List<FoodCourtAccess> findByFoodCourtAndStatus(@Param("foodCourtId") UUID foodCourtId,
                                                   @Param("status") FoodCourtAccessStatus status);
}
