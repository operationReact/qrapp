package com.broandbro.qrapp.recommendation.repository;

import com.broandbro.qrapp.recommendation.entity.CategoryPairingRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CategoryPairingRuleRepository extends JpaRepository<CategoryPairingRule, Long> {

    @Query("""
           SELECT cp FROM CategoryPairingRule cp
           JOIN FETCH cp.sourceCategory
           JOIN FETCH cp.targetCategory
           ORDER BY cp.displayOrder ASC
           """)
    List<CategoryPairingRule> findAllWithCategories();

    @Query("""
           SELECT cp FROM CategoryPairingRule cp
           JOIN FETCH cp.sourceCategory
           JOIN FETCH cp.targetCategory
           WHERE cp.isActive = TRUE
           ORDER BY cp.displayOrder ASC
           """)
    List<CategoryPairingRule> findByIsActiveTrueOrderByDisplayOrderAsc();

    @Query("""
           SELECT cp FROM CategoryPairingRule cp
           JOIN FETCH cp.sourceCategory
           JOIN FETCH cp.targetCategory
           WHERE cp.sourceCategory.id = :sourceCategoryId AND cp.isActive = TRUE
           ORDER BY cp.displayOrder ASC
           """)
    List<CategoryPairingRule> findBySourceCategoryIdAndIsActiveTrueOrderByDisplayOrderAsc(
            @Param("sourceCategoryId") Long sourceCategoryId);

    @Query("""
           SELECT cp FROM CategoryPairingRule cp
           JOIN FETCH cp.targetCategory
           WHERE cp.sourceCategory.id IN :categoryIds AND cp.isActive = TRUE
           ORDER BY cp.displayOrder ASC
           """)
    List<CategoryPairingRule> findByCategoryIds(@Param("categoryIds") List<Long> categoryIds);

    boolean existsBySourceCategoryIdAndTargetCategoryId(Long sourceId, Long targetId);
}
