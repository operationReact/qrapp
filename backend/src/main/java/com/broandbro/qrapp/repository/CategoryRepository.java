package com.broandbro.qrapp.repository;

import com.broandbro.qrapp.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CategoryRepository extends JpaRepository<Category, Long> {
    Optional<Category> findByName(String name);

    /** All non-deleted categories. */
    List<Category> findByIsDeletedFalse();

    /** All soft-deleted categories (for the admin trash view). */
    List<Category> findByIsDeletedTrue();

    /** Find a non-deleted category by ID. */
    Optional<Category> findByIdAndIsDeletedFalse(Long id);

    /** Find a soft-deleted category by ID (for restore). */
    Optional<Category> findByIdAndIsDeletedTrue(Long id);

    /** Find a non-deleted category by name. */
    Optional<Category> findByNameAndIsDeletedFalse(String name);
}
