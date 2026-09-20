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

    @Query("""
           SELECT a FROM AutoSuggestion a
           JOIN FETCH a.itemA
           JOIN FETCH a.itemB
           WHERE a.status = :status
           ORDER BY a.confidence DESC
           """)
    List<AutoSuggestion> findByStatusOrderByConfidenceDesc(@Param("status") SuggestionStatus status);

    @Query("""
           SELECT a FROM AutoSuggestion a
           JOIN FETCH a.itemA
           JOIN FETCH a.itemB
           ORDER BY a.confidence DESC
           """)
    List<AutoSuggestion> findAllWithItems();

    @Query("""
           SELECT a FROM AutoSuggestion a
           JOIN FETCH a.itemA ia
           JOIN FETCH a.itemB ib
           WHERE ia.location.id = :locationId
             AND ib.location.id = :locationId
           ORDER BY a.confidence DESC
           """)
    List<AutoSuggestion> findAllWithItemsByLocation(@Param("locationId") Long locationId);

    @Query("""
           SELECT a FROM AutoSuggestion a
           JOIN FETCH a.itemA ia
           JOIN FETCH a.itemB ib
           WHERE a.status = :status
             AND ia.location.id = :locationId
             AND ib.location.id = :locationId
           ORDER BY a.confidence DESC
           """)
    List<AutoSuggestion> findByStatusAndLocation(
            @Param("status") SuggestionStatus status, @Param("locationId") Long locationId);

    Optional<AutoSuggestion> findByItemAIdAndItemBId(Long itemAId, Long itemBId);

    @Query("""
           SELECT a FROM AutoSuggestion a
           JOIN FETCH a.itemA ia
           JOIN FETCH a.itemB ib
           WHERE a.id = :id
             AND ia.location.id = :locationId
             AND ib.location.id = :locationId
           """)
    Optional<AutoSuggestion> findByIdAndLocation(@Param("id") Long id,
                                                  @Param("locationId") Long locationId);

    @Query("""
           SELECT a FROM AutoSuggestion a
           JOIN FETCH a.itemA ia
           JOIN FETCH a.itemB ib
           WHERE a.id IN :ids
             AND ia.location.id = :locationId
             AND ib.location.id = :locationId
           """)
    List<AutoSuggestion> findAllByIdAndLocation(@Param("ids") List<Long> ids,
                                                 @Param("locationId") Long locationId);

    boolean existsByItemAIdAndItemBIdAndStatusIn(Long itemAId, Long itemBId, List<SuggestionStatus> statuses);

    @Query("""
           SELECT a FROM AutoSuggestion a
           JOIN FETCH a.itemA ia
           JOIN FETCH a.itemB ib
           WHERE a.itemA.id IN :itemIds AND a.status = 'ACCEPTED'
           ORDER BY a.confidence DESC
           """)
    List<AutoSuggestion> findAcceptedByItemIds(@Param("itemIds") List<Long> itemIds);

    long countByStatus(SuggestionStatus status);

    @Query("""
           SELECT COUNT(a) FROM AutoSuggestion a
           WHERE a.status = :status
             AND a.itemA.location.id = :locationId
             AND a.itemB.location.id = :locationId
           """)
    long countByStatusAndLocation(@Param("status") SuggestionStatus status,
                                   @Param("locationId") Long locationId);
}
