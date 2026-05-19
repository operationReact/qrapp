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
     *
     * Hidden items are ALWAYS excluded (isHidden = false is a hard filter).
     * All non-hidden items are returned regardless of stock status —
     * out-of-stock items are displayed on the menu but marked unavailable on the frontend.
     */
    @Query("SELECT m FROM MenuItem m WHERE " +
           "m.isHidden = false AND " +
           "(:isVeg       IS NULL OR m.isVeg        = :isVeg) AND " +
           "(:categoryId  IS NULL OR m.category.id  = :categoryId) AND " +
           "(:recommended IS NULL OR m.recommended  = :recommended) " +
           "ORDER BY m.id ASC")
    List<MenuItem> findByFilters(
            @Param("isVeg")         Boolean isVeg,
            @Param("categoryId")    Long    categoryId,
            @Param("recommended")   Boolean recommended,
            Pageable pageable
    );

    /**
     * Recommended items — LIMIT is applied in SQL via Pageable, not in Java.
     * Uses the composite index idx_menu_item_avail_rec (available, recommended).
     */
    @Query("SELECT m FROM MenuItem m " +
           "WHERE m.recommended = true AND m.isHidden = false " +
           "ORDER BY m.id DESC")
    List<MenuItem> findTopRecommended(Pageable pageable);

    /**
     * Get all menu items for a specific category by category ID.
     * Returns menu items ordered by ID.
     */
    @Query("SELECT m FROM MenuItem m " +
           "WHERE m.category.id = :categoryId " +
           "ORDER BY m.id ASC")
    List<MenuItem> findByCategoryId(@Param("categoryId") Long categoryId);

    /**
     * Get all menu items for a specific tag by tag ID.
     * Returns menu items ordered by ID.
     */
    @Query("SELECT m FROM MenuItem m " +
           "WHERE m.tag.id = :tagId " +
           "ORDER BY m.id ASC")
    List<MenuItem> findByTagId(@Param("tagId") Long tagId);
}
