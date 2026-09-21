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
           WHERE r.id = :id
             AND si.location.id = :locationId
             AND ti.location.id = :locationId
           """)
    Optional<ItemRecommendation> findByIdAndLocation(@Param("id") Long id,
                                                      @Param("locationId") Long locationId);

    @Query("""
           SELECT r FROM ItemRecommendation r
           JOIN FETCH r.sourceItem si
           JOIN FETCH r.targetItem ti
           WHERE r.sourceItem.id IN :itemIds AND r.isActive = TRUE
           ORDER BY r.sourceItem.id, r.displayOrder ASC
           """)
    List<ItemRecommendation> findBySourceItemIds(@Param("itemIds") List<Long> itemIds);

    void deleteBySourceItemIdAndTargetItemId(Long sourceItemId, Long targetItemId);

    @Query("""
           SELECT r FROM ItemRecommendation r
           JOIN FETCH r.sourceItem
           JOIN FETCH r.targetItem
           ORDER BY r.sourceItem.id, r.displayOrder ASC
           """)
    List<ItemRecommendation> findAllWithItems();

    @Query("""
           SELECT r FROM ItemRecommendation r
           JOIN FETCH r.sourceItem si
           JOIN FETCH r.targetItem ti
           WHERE si.location.id = :locationId
             AND ti.location.id = :locationId
           ORDER BY si.id, r.displayOrder ASC
           """)
    List<ItemRecommendation> findAllWithItemsByLocation(@Param("locationId") Long locationId);

    @Query("""
           SELECT r FROM ItemRecommendation r
           JOIN FETCH r.sourceItem
           JOIN FETCH r.targetItem
           WHERE r.sourceItem.id = :sourceItemId
           ORDER BY r.displayOrder ASC
           """)
    List<ItemRecommendation> findBySourceItemIdWithItems(@Param("sourceItemId") Long sourceItemId);

    @Query("""
           SELECT r FROM ItemRecommendation r
           JOIN FETCH r.sourceItem si
           JOIN FETCH r.targetItem ti
           WHERE si.id = :sourceItemId
             AND si.location.id = :locationId
             AND ti.location.id = :locationId
           ORDER BY r.displayOrder ASC
           """)
    List<ItemRecommendation> findBySourceItemIdWithItemsByLocation(
            @Param("sourceItemId") Long sourceItemId, @Param("locationId") Long locationId);
}
