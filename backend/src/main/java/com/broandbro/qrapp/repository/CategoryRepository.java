package com.broandbro.qrapp.repository;

import com.broandbro.qrapp.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CategoryRepository extends JpaRepository<Category, Long> {
    List<Category> findByLocationIdAndIsDeletedFalse(Long locationId);

    /** All soft-deleted categories (for the admin trash view). */
    List<Category> findByLocationIdAndIsDeletedTrue(Long locationId);

    /** Find a non-deleted category by ID. */
    Optional<Category> findByIdAndLocationIdAndIsDeletedFalse(Long id, Long locationId);

    /** Find a soft-deleted category by ID (for restore). */
    Optional<Category> findByIdAndLocationIdAndIsDeletedTrue(Long id, Long locationId);

    /** Find a non-deleted category by name. */
    Optional<Category> findByLocationIdAndNameAndIsDeletedFalse(Long locationId, String name);
}
