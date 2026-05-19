package com.broandbro.qrapp.repository;

import com.broandbro.qrapp.entity.VendorMenuItemCostHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface VendorMenuItemCostHistoryRepository
        extends JpaRepository<VendorMenuItemCostHistory, Long> {

    /**
     * Returns the active procurement cost for a given (shop, menuItem) pair at the specified instant.
     */
    @Query("""
        SELECT h FROM VendorMenuItemCostHistory h
        WHERE h.shop.id     = :shopId
          AND h.menuItem.id = :menuItemId
          AND h.effectiveFrom <= :instant
          AND (h.effectiveTo IS NULL OR h.effectiveTo > :instant)
        ORDER BY h.effectiveFrom DESC
        """)
    Optional<VendorMenuItemCostHistory> findActiveAt(
            @Param("shopId")     Long shopId,
            @Param("menuItemId") Long menuItemId,
            @Param("instant")    Instant instant);

    /** Returns current active cost (at now). */
    default Optional<VendorMenuItemCostHistory> findCurrentActive(Long shopId, Long menuItemId) {
        return findActiveAt(shopId, menuItemId, Instant.now());
    }

    /** All cost records for a given (shop, menuItem) pair, most recent first. */
    @Query("""
        SELECT h FROM VendorMenuItemCostHistory h
        WHERE h.shop.id = :shopId AND h.menuItem.id = :menuItemId
        ORDER BY h.effectiveFrom DESC
        """)
    List<VendorMenuItemCostHistory> findAllByShopAndItem(
            @Param("shopId") Long shopId, @Param("menuItemId") Long menuItemId);

    /** All active vendor costs for a menu item across all vendors – for price comparison. */
    @Query("""
        SELECT h FROM VendorMenuItemCostHistory h
        WHERE h.menuItem.id = :menuItemId
          AND h.effectiveFrom <= :instant
          AND (h.effectiveTo IS NULL OR h.effectiveTo > :instant)
        ORDER BY h.costPrice ASC
        """)
    List<VendorMenuItemCostHistory> findAllVendorCostsAt(
            @Param("menuItemId") Long menuItemId,
            @Param("instant")    Instant instant);

    /** Close open cost records for a (shop, menuItem) pair before inserting a new cost. */
    @Modifying
    @Query("""
        UPDATE VendorMenuItemCostHistory h
        SET h.effectiveTo = :closedAt
        WHERE h.shop.id = :shopId
          AND h.menuItem.id = :menuItemId
          AND h.effectiveTo IS NULL
        """)
    void closeActiveCosts(
            @Param("shopId")     Long shopId,
            @Param("menuItemId") Long menuItemId,
            @Param("closedAt")   Instant closedAt);
}

