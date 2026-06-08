package com.broandbro.qrapp.classification.repository;

import com.broandbro.qrapp.classification.entity.MealType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MealTypeRepository extends JpaRepository<MealType, Long> {

    /** All active meal types ordered by displayOrder. */
    List<MealType> findByIsActiveTrueOrderByDisplayOrderAsc();

    Optional<MealType> findByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCase(String name);
}

