package com.broandbro.qrapp.recommendation.repository;

import com.broandbro.qrapp.recommendation.entity.RecommendationRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface RecommendationRuleRepository extends JpaRepository<RecommendationRule, Long> {

    @Query("""
           SELECT r FROM RecommendationRule r
           LEFT JOIN FETCH r.targetItem
           LEFT JOIN FETCH r.targetCategory
           LEFT JOIN FETCH r.triggerItem
           LEFT JOIN FETCH r.triggerCategory
           WHERE r.location.id = :locationId
           ORDER BY r.priority DESC, r.id ASC
           """)
    List<RecommendationRule> findByLocationWithTargets(@Param("locationId") Long locationId);

    boolean existsByTriggerItemIdAndTargetItemId(Long triggerItemId, Long targetItemId);


    @Query("""
           SELECT r FROM RecommendationRule r
           LEFT JOIN FETCH r.targetItem
           LEFT JOIN FETCH r.targetCategory
           LEFT JOIN FETCH r.triggerItem
           LEFT JOIN FETCH r.triggerCategory
           WHERE r.id = :id AND r.location.id = :locationId
           """)
    Optional<RecommendationRule> findByIdAndLocationWithTargets(@Param("id") Long id,
                                                               @Param("locationId") Long locationId);
}
