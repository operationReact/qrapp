package com.broandbro.qrapp.recommendation.repository;

import com.broandbro.qrapp.recommendation.entity.AutoSuggestion;
import com.broandbro.qrapp.recommendation.enums.SuggestionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AutoSuggestionRepository extends JpaRepository<AutoSuggestion, Long> {

    List<AutoSuggestion> findByStatusOrderByConfidenceDesc(SuggestionStatus status);

    Optional<AutoSuggestion> findByItemAIdAndItemBId(Long itemAId, Long itemBId);

    boolean existsByItemAIdAndItemBIdAndStatusIn(Long itemAId, Long itemBId, List<SuggestionStatus> statuses);

    /** Accepted pairs for a given set of source item IDs — used by the engine. */
    @Query("""
           SELECT a FROM AutoSuggestion a
           JOIN FETCH a.itemA ia
           JOIN FETCH a.itemB ib
           WHERE a.itemA.id IN :itemIds AND a.status = 'ACCEPTED'
           ORDER BY a.confidence DESC
           """)
    List<AutoSuggestion> findAcceptedByItemIds(@Param("itemIds") List<Long> itemIds);

    long countByStatus(SuggestionStatus status);
}

