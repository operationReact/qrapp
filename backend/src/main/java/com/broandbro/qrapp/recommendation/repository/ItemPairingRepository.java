package com.broandbro.qrapp.recommendation.repository;

import com.broandbro.qrapp.recommendation.entity.ItemPairing;
import com.broandbro.qrapp.recommendation.enums.PairingRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ItemPairingRepository extends JpaRepository<ItemPairing, Long> {

    /**
     * All active pairings for a source item, sorted by priority DESC (highest first).
     * Target item eagerly fetched to avoid N+1 in the service layer.
     */
    @Query("""
           SELECT ip FROM ItemPairing ip
           JOIN FETCH ip.targetItem t
           WHERE ip.sourceItem.id = :itemId
             AND ip.isActive = TRUE
           ORDER BY ip.priority DESC
           """)
    List<ItemPairing> findActiveBySourceItemId(@Param("itemId") Long itemId);

    /**
     * All pairings (active and inactive) for a source item — used by admin views.
     */
    @Query("""
           SELECT ip FROM ItemPairing ip
           JOIN FETCH ip.sourceItem s
           JOIN FETCH ip.targetItem t
           WHERE ip.sourceItem.id = :itemId
           ORDER BY ip.priority DESC
           """)
    List<ItemPairing> findAllBySourceItemId(@Param("itemId") Long itemId);

    /**
     * Active pairings for a source item filtered by role, sorted by priority DESC.
     */
    @Query("""
           SELECT ip FROM ItemPairing ip
           JOIN FETCH ip.targetItem t
           WHERE ip.sourceItem.id = :itemId
             AND ip.pairingRole   = :role
             AND ip.isActive      = TRUE
           ORDER BY ip.priority DESC
           """)
    List<ItemPairing> findActiveBySourceItemIdAndRole(@Param("itemId") Long itemId,
                                                      @Param("role")   PairingRole role);

    /**
     * Batch-fetch active pairings for multiple source item IDs.
     * Useful for the recommendation engine to check existing pairings in one query.
     */
    @Query("""
           SELECT ip FROM ItemPairing ip
           JOIN FETCH ip.sourceItem s
           JOIN FETCH ip.targetItem t
           WHERE ip.sourceItem.id IN :itemIds
             AND ip.isActive = TRUE
           ORDER BY ip.priority DESC
           """)
    List<ItemPairing> findActiveBySourceItemIds(@Param("itemIds") List<Long> itemIds);

    /**
     * Lightweight: target item IDs for a list of source items (used by recommendation engine).
     */
    @Query("""
           SELECT ip.targetItem.id FROM ItemPairing ip
           WHERE ip.sourceItem.id IN :itemIds
             AND ip.isActive = TRUE
           ORDER BY ip.priority DESC
           """)
    List<Long> findTargetIdsBySourceIds(@Param("itemIds") List<Long> itemIds);

    boolean existsBySourceItemIdAndTargetItemId(Long sourceItemId, Long targetItemId);

    /** Soft-delete helper: does an active pairing for a specific pair exist? */
    boolean existsBySourceItemIdAndTargetItemIdAndIsActiveTrue(Long sourceItemId, Long targetItemId);

    @Modifying
    @Query("DELETE FROM ItemPairing ip WHERE ip.sourceItem.id = :itemId")
    void deleteAllBySourceItemId(@Param("itemId") Long itemId);
}

