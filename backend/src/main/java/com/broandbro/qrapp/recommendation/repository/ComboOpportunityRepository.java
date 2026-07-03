package com.broandbro.qrapp.recommendation.repository;

import com.broandbro.qrapp.recommendation.entity.ComboOpportunity;
import com.broandbro.qrapp.recommendation.enums.ComboOpportunityStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ComboOpportunityRepository extends JpaRepository<ComboOpportunity, Long> {

    /** All opportunities ordered by quality score descending. */
    @Query("SELECT o FROM ComboOpportunity o ORDER BY o.qualityScore DESC, o.createdAt DESC")
    List<ComboOpportunity> findAllOrdered();

    /** Opportunities filtered by status. */
    List<ComboOpportunity> findByStatusOrderByQualityScoreDescCreatedAtDesc(ComboOpportunityStatus status);

    /**
     * Find pairs from co-occurrence stats that do NOT yet have a non-rejected opportunity,
     * and are not already covered by an active combo.
     *
     * Used by the analysis engine to detect genuinely missed combos.
     */
    @Query(value = """
           SELECT cs.item_a_id, cs.item_b_id, cs.co_count, cs.confidence
           FROM rec_co_occurrence_stat cs
           WHERE cs.co_count >= :minCoCount
             AND cs.confidence >= :minConfidence
             AND NOT EXISTS (
                 SELECT 1 FROM combo_opportunity co
                 JOIN  combo_opportunity_item coi1 ON coi1.opportunity_id = co.id
                 JOIN  combo_opportunity_item coi2 ON coi2.opportunity_id = co.id
                 WHERE coi1.menu_item_id = cs.item_a_id
                   AND coi2.menu_item_id = cs.item_b_id
                   AND co.status <> 'REJECTED'
             )
             AND NOT EXISTS (
                 SELECT 1 FROM combo_items ci1
                 JOIN  combo_items ci2 ON ci1.combo_id = ci2.combo_id
                 JOIN  combos c       ON c.id          = ci1.combo_id
                 WHERE ci1.menu_item_id = cs.item_a_id
                   AND ci2.menu_item_id = cs.item_b_id
                   AND c.deleted_at IS NULL
                   AND c.is_active  = TRUE
             )
           ORDER BY cs.co_count DESC
           LIMIT :limit
           """, nativeQuery = true)
    List<Object[]> findCandidatePairs(
            @Param("minCoCount")    int minCoCount,
            @Param("minConfidence") double minConfidence,
            @Param("limit")        int limit);

    /**
     * Pairs frequently ordered together that have no combo covering them
     * and no existing non-rejected opportunity — the "missed" section.
     */
    @Query(value = """
           SELECT cs.item_a_id, cs.item_b_id, cs.co_count,
                  mia.name AS item_a_name, mib.name AS item_b_name
           FROM rec_co_occurrence_stat cs
           JOIN menu_item mia ON mia.id = cs.item_a_id
           JOIN menu_item mib ON mib.id = cs.item_b_id
           WHERE cs.co_count >= :minCoCount
             AND NOT EXISTS (
                 SELECT 1 FROM combo_items ci1
                 JOIN combo_items ci2 ON ci1.combo_id = ci2.combo_id
                 JOIN combos c ON c.id = ci1.combo_id
                 WHERE ci1.menu_item_id = cs.item_a_id
                   AND ci2.menu_item_id = cs.item_b_id
                   AND c.deleted_at IS NULL AND c.is_active = TRUE
             )
             AND NOT EXISTS (
                 SELECT 1 FROM combo_opportunity co
                 JOIN combo_opportunity_item coi1 ON coi1.opportunity_id = co.id
                 JOIN combo_opportunity_item coi2 ON coi2.opportunity_id = co.id
                 WHERE coi1.menu_item_id = cs.item_a_id
                   AND coi2.menu_item_id = cs.item_b_id
                   AND co.status <> 'REJECTED'
             )
           ORDER BY cs.co_count DESC
           LIMIT :limit
           """, nativeQuery = true)
    List<Object[]> findMissedPairs(
            @Param("minCoCount") int minCoCount,
            @Param("limit")      int limit);
}

