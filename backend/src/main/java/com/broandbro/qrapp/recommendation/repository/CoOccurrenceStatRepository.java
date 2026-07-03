package com.broandbro.qrapp.recommendation.repository;

import com.broandbro.qrapp.recommendation.entity.CoOccurrenceStat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
public interface CoOccurrenceStatRepository extends JpaRepository<CoOccurrenceStat, Long> {

    Optional<CoOccurrenceStat> findByItemAIdAndItemBId(Long itemAId, Long itemBId);

    List<CoOccurrenceStat> findByItemAIdOrderByConfidenceDesc(Long itemAId);

    /**
     * Pairs with confidence >= threshold, used to seed AutoSuggestion queue.
     */
    @Query("""
           SELECT c FROM CoOccurrenceStat c
           WHERE c.itemA.id IN :itemIds
             AND c.confidence >= :minConfidence
             AND c.coCount >= :minCoCount
           ORDER BY c.confidence DESC
           """)
    List<CoOccurrenceStat> findStrongPairs(
            @Param("itemIds") List<Long> itemIds,
            @Param("minConfidence") java.math.BigDecimal minConfidence,
            @Param("minCoCount") int minCoCount);

    /**
     * Native upsert for nightly computation.
     */
    @Modifying
    @Transactional
    @Query(value = """
           INSERT INTO rec_co_occurrence_stat (item_a_id, item_b_id, co_count, item_a_count, confidence, lift, computed_at)
           VALUES (:itemAId, :itemBId, :coCount, :itemACount, :confidence, :lift, NOW())
           ON CONFLICT (item_a_id, item_b_id)
           DO UPDATE SET co_count = :coCount, item_a_count = :itemACount,
                         confidence = :confidence, lift = :lift, computed_at = NOW()
           """, nativeQuery = true)
    void upsert(
            @Param("itemAId") Long itemAId,
            @Param("itemBId") Long itemBId,
            @Param("coCount") int coCount,
            @Param("itemACount") int itemACount,
            @Param("confidence") java.math.BigDecimal confidence,
            @Param("lift") java.math.BigDecimal lift);
}

