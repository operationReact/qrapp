package com.broandbro.qrapp.recommendation.repository;

import com.broandbro.qrapp.recommendation.entity.RecommendationInteraction;
import com.broandbro.qrapp.recommendation.enums.InteractionType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

/**
 * Repository for {@link RecommendationInteraction}.
 *
 * <p>All analytics queries include {@code restaurant_id} as the first predicate
 * to enforce strict multi-vendor data isolation.
 */
@Repository
public interface RecommendationInteractionRepository extends JpaRepository<RecommendationInteraction, Long> {

    // ── Aggregate counts (restaurant-scoped) ─────────────────────────────────

    long countByRestaurantIdAndInteractionType(Long restaurantId, InteractionType type);

    long countByRestaurantIdAndInteractionTypeAndCreatedAtBetween(
            Long restaurantId, InteractionType type, Instant from, Instant to);

    // ── Per-pairing analytics (restaurant-scoped) ────────────────────────────

    /**
     * Returns per-pairing view / acceptance / rejection counts for a given restaurant.
     *
     * <p>Each row represents one unique (sourceItem, recommendedItem) pair.
     * Sorted by views DESC by default — callers may re-sort after fetching.
     *
     * <p>Uses a Spring Data projection interface {@link PairingStatProjection}
     * to avoid full entity loading.
     */
    @Query("""
           SELECT ri.sourceItem.id               AS sourceItemId,
                  ri.sourceItem.name              AS sourceItemName,
                  ri.recommendedItem.id           AS recommendedItemId,
                  ri.recommendedItem.name         AS recommendedItemName,
                  ri.recommendedItem.imageUrl     AS recommendedItemImageUrl,
                  SUM(CASE WHEN ri.interactionType = 'VIEWED'   THEN 1 ELSE 0 END) AS views,
                  SUM(CASE WHEN ri.interactionType = 'ACCEPTED' THEN 1 ELSE 0 END) AS acceptances,
                  SUM(CASE WHEN ri.interactionType = 'REJECTED' THEN 1 ELSE 0 END) AS rejections
           FROM   RecommendationInteraction ri
           WHERE  ri.restaurantId = :restaurantId
           GROUP BY ri.sourceItem.id,       ri.sourceItem.name,
                    ri.recommendedItem.id,  ri.recommendedItem.name,
                    ri.recommendedItem.imageUrl
           ORDER BY views DESC
           """)
    List<PairingStatProjection> findPairingStats(@Param("restaurantId") Long restaurantId);

    /**
     * Same as {@link #findPairingStats} but filtered to a time window.
     */
    @Query("""
           SELECT ri.sourceItem.id               AS sourceItemId,
                  ri.sourceItem.name              AS sourceItemName,
                  ri.recommendedItem.id           AS recommendedItemId,
                  ri.recommendedItem.name         AS recommendedItemName,
                  ri.recommendedItem.imageUrl     AS recommendedItemImageUrl,
                  SUM(CASE WHEN ri.interactionType = 'VIEWED'   THEN 1 ELSE 0 END) AS views,
                  SUM(CASE WHEN ri.interactionType = 'ACCEPTED' THEN 1 ELSE 0 END) AS acceptances,
                  SUM(CASE WHEN ri.interactionType = 'REJECTED' THEN 1 ELSE 0 END) AS rejections
           FROM   RecommendationInteraction ri
           WHERE  ri.restaurantId = :restaurantId
             AND  ri.createdAt BETWEEN :from AND :to
           GROUP BY ri.sourceItem.id,       ri.sourceItem.name,
                    ri.recommendedItem.id,  ri.recommendedItem.name,
                    ri.recommendedItem.imageUrl
           ORDER BY views DESC
           """)
    List<PairingStatProjection> findPairingStatsBetween(
            @Param("restaurantId") Long restaurantId,
            @Param("from")         Instant from,
            @Param("to")           Instant to);

    /**
     * Total views across all pairings for a restaurant.
     */
    @Query("SELECT COUNT(ri) FROM RecommendationInteraction ri WHERE ri.restaurantId = :restaurantId AND ri.interactionType = 'VIEWED'")
    long countTotalViews(@Param("restaurantId") Long restaurantId);

    /**
     * Total acceptances across all pairings for a restaurant.
     */
    @Query("SELECT COUNT(ri) FROM RecommendationInteraction ri WHERE ri.restaurantId = :restaurantId AND ri.interactionType = 'ACCEPTED'")
    long countTotalAcceptances(@Param("restaurantId") Long restaurantId);

    /**
     * Total rejections across all pairings for a restaurant.
     */
    @Query("SELECT COUNT(ri) FROM RecommendationInteraction ri WHERE ri.restaurantId = :restaurantId AND ri.interactionType = 'REJECTED'")
    long countTotalRejections(@Param("restaurantId") Long restaurantId);

    /**
     * Per-rule view and acceptance counts for a restaurant. Interactions without a rule are excluded.
     */
    @Query("""
           SELECT ri.ruleId AS ruleId,
                  SUM(CASE WHEN ri.interactionType = 'VIEWED'   THEN 1 ELSE 0 END) AS views,
                  SUM(CASE WHEN ri.interactionType = 'ACCEPTED' THEN 1 ELSE 0 END) AS acceptances
           FROM   RecommendationInteraction ri
           WHERE  ri.restaurantId = :restaurantId
             AND  ri.ruleId IS NOT NULL
           GROUP BY ri.ruleId
           """)
    List<RuleStatProjection> findRuleStats(@Param("restaurantId") Long restaurantId);

    // ── Projection ────────────────────────────────────────────────────────────

    interface RuleStatProjection {
        Long getRuleId();
        Long getViews();
        Long getAcceptances();
    }

    /**
     * Lightweight read-only projection for per-pairing aggregate data.
     *
     * <p>[FUTURE: Recommendation Scoring / AI Suggestions]
     * Add {@code getResolvedBy()} and {@code getPairingRole()} here when
     * source-level and role-level breakdowns are needed for ML model training.
     */
    interface PairingStatProjection {
        Long   getSourceItemId();
        String getSourceItemName();
        Long   getRecommendedItemId();
        String getRecommendedItemName();
        String getRecommendedItemImageUrl();
        Long   getViews();
        Long   getAcceptances();
        Long   getRejections();
    }
}

