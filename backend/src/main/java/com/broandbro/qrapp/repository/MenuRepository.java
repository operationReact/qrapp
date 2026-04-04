package com.broandbro.qrapp.repository;

import com.broandbro.qrapp.entity.MenuItem;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface MenuRepository extends JpaRepository<MenuItem, Long> {

    /**
     * Filtered menu query — all predicates are optional (null = no filter).
     * Runs a single SQL SELECT with WHERE pushed to the database instead of
     * fetching everything and filtering in Java.
     */
    @Query("SELECT m FROM MenuItem m WHERE " +
           "(:isVeg    IS NULL OR m.isVeg       = :isVeg)    AND " +
           "(:category IS NULL OR m.category = :category) AND " +
           "(:recommended IS NULL OR m.recommended = :recommended) AND " +
           "(:available   IS NULL OR m.available   = :available) " +
           "ORDER BY m.id ASC")
    List<MenuItem> findByFilters(
            @Param("isVeg")       Boolean isVeg,
            @Param("category")    String  category,
            @Param("recommended") Boolean recommended,
            @Param("available")   Boolean available,
            Pageable pageable
    );

    /**
     * Recommended items — LIMIT is applied in SQL via Pageable, not in Java.
     * Uses the composite index idx_menu_item_avail_rec (available, recommended).
     */
    @Query("SELECT m FROM MenuItem m " +
           "WHERE m.recommended = true AND m.available = true " +
           "ORDER BY m.id DESC")
    List<MenuItem> findTopRecommended(Pageable pageable);
}
