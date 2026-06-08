package com.broandbro.qrapp.classification.repository;

import com.broandbro.qrapp.classification.entity.CuisineType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CuisineTypeRepository extends JpaRepository<CuisineType, Long> {

    /** All active cuisine types ordered by displayOrder. */
    List<CuisineType> findByIsActiveTrueOrderByDisplayOrderAsc();

    Optional<CuisineType> findByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCase(String name);
}

