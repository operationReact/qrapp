package com.broandbro.qrapp.repository;

import com.broandbro.qrapp.entity.MenuItem;
import com.broandbro.qrapp.enums.ImageGenerationStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface MenuRepository extends JpaRepository<MenuItem, Long> {
    List<MenuItem> findByLocationIdAndIsDeletedFalse(Long locationId);

    /**
     * Filtered menu query — all predicates are optional (null = no filter).
     *
     * Hidden items are ALWAYS excluded (isHidden = false is a hard filter).
     * Soft-deleted items are ALWAYS excluded (isDeleted = false is a hard filter).
     * All non-hidden items are returned regardless of stock status —
     * out-of-stock items are displayed on the menu but marked unavailable on the frontend.
     */
    @Query("SELECT m FROM MenuItem m WHERE " +
           "m.isHidden = false AND " +
           "m.isDeleted = false AND " +
           "(:isVeg       IS NULL OR m.isVeg        = :isVeg) AND " +
           "m.location.id = :locationId AND " +
           "(:categoryId  IS NULL OR (m.category.id = :categoryId AND m.category.location.id = :locationId)) AND " +
           "(:recommended IS NULL OR m.recommended  = :recommended) " +
           "ORDER BY m.id ASC")
    @EntityGraph(attributePaths = {"category", "tag", "vendor"})
    List<MenuItem> findByFilters(
            @Param("locationId")  Long    locationId,
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
           "WHERE m.location.id = :locationId AND m.recommended = true AND m.isHidden = false AND m.isDeleted = false " +
           "ORDER BY m.id DESC")
    @EntityGraph(attributePaths = {"category", "tag", "vendor"})
    List<MenuItem> findTopRecommended(@Param("locationId") Long locationId, Pageable pageable);

    /**
     * Get all menu items for a specific category by category ID.
     * Returns non-deleted menu items ordered by ID.
     */
    @Query("SELECT m FROM MenuItem m " +
           "WHERE m.location.id = :locationId AND m.category.id = :categoryId AND m.isDeleted = false " +
           "ORDER BY m.id ASC")
    @EntityGraph(attributePaths = {"category", "tag", "vendor"})
    List<MenuItem> findByCategoryId(@Param("locationId") Long locationId, @Param("categoryId") Long categoryId);

    /**
     * Get all menu items for a specific tag by tag ID.
     * Returns non-deleted menu items ordered by ID.
     */
    @Query("SELECT m FROM MenuItem m " +
           "WHERE m.location.id = :locationId AND m.tag.id = :tagId AND m.isDeleted = false " +
           "ORDER BY m.id ASC")
    @EntityGraph(attributePaths = {"category", "tag", "vendor"})
    List<MenuItem> findByTagId(@Param("locationId") Long locationId, @Param("tagId") Long tagId);

    /**
     * Get all visible (non-hidden, non-deleted) menu items for a specific tag name.
     * Used for PreOrderOnly item discovery.
     */
    @Query("SELECT m FROM MenuItem m " +
           "WHERE m.location.id = :locationId AND m.tag.name = :tagName AND m.isHidden = false AND m.isDeleted = false " +
           "ORDER BY m.id ASC")
    List<MenuItem> findVisibleByTagName(@Param("locationId") Long locationId, @Param("tagName") String tagName);

    @Query("SELECT m FROM MenuItem m WHERE m.tag.name = :tagName AND m.isHidden = false AND m.isDeleted = false ORDER BY m.id ASC")
    List<MenuItem> findVisibleByTagName(@Param("tagName") String tagName);

    Optional<MenuItem> findBySkuCodeAndLocationId(String skuCode, Long locationId);

    /** All soft-deleted menu items (admin trash view). */
    @Query("SELECT m FROM MenuItem m WHERE m.location.id = :locationId AND m.isDeleted = true ORDER BY m.id DESC")
    List<MenuItem> findByLocationIdAndIsDeletedTrue(@Param("locationId") Long locationId);

    /**
     * Soft-deleted items under a specific category — used when restoring a category
     * to also restore items that were cascade-deleted with it.
     */
    @Query("SELECT m FROM MenuItem m WHERE m.location.id = :locationId AND m.category.id = :categoryId AND m.isDeleted = true ORDER BY m.id ASC")
    List<MenuItem> findByLocationIdAndCategoryIdAndIsDeletedTrue(@Param("locationId") Long locationId, @Param("categoryId") Long categoryId);

    @Query("SELECT m FROM MenuItem m WHERE m.location.id = :locationId AND LOWER(m.name) = LOWER(:name) AND m.category.id = :categoryId")
    Optional<MenuItem> findByNameIgnoreCaseAndCategoryIdAndLocationId(
            @Param("name") String name,
            @Param("categoryId") Long categoryId,
            @Param("locationId") Long locationId);

    Optional<MenuItem> findByIdAndLocationId(Long id, Long locationId);

    List<MenuItem> findByIdInAndLocationId(List<Long> ids, Long locationId);

    @Query("SELECT m.location.id FROM MenuItem m WHERE m.id = :id")
    Optional<Long> findLocationIdById(@Param("id") Long id);

    /**
     * Directly updates imageUrl, aiGeneratedImage flag and generation status in one SQL statement.
     * Used by the AI image apply flow to avoid full entity load/save which can silently no-op
     * due to Hibernate session state or lazy-proxy issues.
     */
    @Modifying
    @Query("UPDATE MenuItem m SET " +
           "m.imageUrl = :imageUrl, " +
           "m.aiGeneratedImage = true, " +
           "m.imageGenerationStatus = :status, " +
           "m.updatedAt = :now " +
           "WHERE m.id = :id AND m.location.id = :locationId")
    int applyAiImageUrl(@Param("id") Long id,
                       @Param("locationId") Long locationId,
                        @Param("imageUrl") String imageUrl,
                        @Param("status") ImageGenerationStatus status,
                        @Param("now") java.time.Instant now);

    /**
     * Directly updates only the imageUrl column.
     * Used by the admin PUT /menu/{id} endpoint to guarantee the URL is persisted.
     */
    @Modifying
    @Query("UPDATE MenuItem m SET m.imageUrl = :imageUrl, m.updatedAt = :now WHERE m.id = :id AND m.location.id = :locationId")
    int updateImageUrl(@Param("id") Long id,
                       @Param("locationId") Long locationId,
                       @Param("imageUrl") String imageUrl,
                       @Param("now") java.time.Instant now);
}
