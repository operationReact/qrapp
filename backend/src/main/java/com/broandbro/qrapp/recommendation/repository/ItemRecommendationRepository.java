package com.broandbro.qrapp.recommendation.repository;

import com.broandbro.qrapp.recommendation.entity.ItemRecommendation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ItemRecommendationRepository extends JpaRepository<ItemRecommendation, Long> {

    List<ItemRecommendation> findBySourceItemIdAndIsActiveTrueOrderByDisplayOrderAsc(Long sourceItemId);

    List<ItemRecommendation> findBySourceItemIdOrderByDisplayOrderAsc(Long sourceItemId);

    Optional<ItemRecommendation> findBySourceItemIdAndTargetItemId(Long sourceItemId, Long targetItemId);

    @Query("""
           SELECT r FROM ItemRecommendation r
           JOIN FETCH r.sourceItem si
           JOIN FETCH r.targetItem ti
           WHERE r.sourceItem.id IN :itemIds AND r.isActive = TRUE
           ORDER BY r.sourceItem.id, r.displayOrder ASC
           """)
    List<ItemRecommendation> findBySourceItemIds(@Param("itemIds") List<Long> itemIds);

    void deleteBySourceItemIdAndTargetItemId(Long sourceItemId, Long targetItemId);
}

