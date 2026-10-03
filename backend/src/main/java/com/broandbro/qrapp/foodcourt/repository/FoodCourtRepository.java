package com.broandbro.qrapp.foodcourt.repository;

import com.broandbro.qrapp.foodcourt.entity.FoodCourt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FoodCourtRepository extends JpaRepository<FoodCourt, UUID> {

    @Query("SELECT f FROM FoodCourt f WHERE f.deletedAt IS NULL AND f.id = :id")
    Optional<FoodCourt> findActiveById(@Param("id") UUID id);

    @Query("SELECT f FROM FoodCourt f WHERE f.deletedAt IS NULL ORDER BY f.name ASC")
    List<FoodCourt> findAllActive();

    @Query("SELECT f FROM FoodCourt f WHERE f.deletedAt IS NULL AND f.id IN :ids ORDER BY f.name ASC")
    List<FoodCourt> findAllActiveInScope(@Param("ids") Collection<UUID> ids);

    boolean existsByCodeIgnoreCase(String code);

    @Query("SELECT f FROM FoodCourt f WHERE f.deletedAt IS NULL AND lower(f.code) = lower(:code)")
    Optional<FoodCourt> findActiveByCode(@Param("code") String code);
}
