package com.broandbro.qrapp.repository;

import com.broandbro.qrapp.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CategoryRepository extends JpaRepository<Category, Long> {
    List<Category> findByLocationIdAndIsDeletedFalse(Long locationId);

    /** Active categories ordered for customer-facing display (admin-controlled order, then name). */
    List<Category> findByLocationIdAndIsDeletedFalseOrderByDisplayOrderAscNameAsc(Long locationId);

    /** All soft-deleted categories (for the admin trash view). */
    List<Category> findByLocationIdAndIsDeletedTrue(Long locationId);

    /** Find a non-deleted category by ID. */
    Optional<Category> findByIdAndLocationIdAndIsDeletedFalse(Long id, Long locationId);

    /** Find a soft-deleted category by ID (for restore). */
    Optional<Category> findByIdAndLocationIdAndIsDeletedTrue(Long id, Long locationId);

    /** Find a non-deleted category by name. */
    Optional<Category> findByLocationIdAndNameAndIsDeletedFalse(Long locationId, String name);

    /** Delete all categories for a location (both active and soft-deleted). */
    @Modifying
    @Query("DELETE FROM Category c WHERE c.location.id = :locationId")
    void deleteByLocationId(@Param("locationId") Long locationId);
}
