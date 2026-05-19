package com.broandbro.qrapp.repository;

import com.broandbro.qrapp.entity.MenuItemSellingPriceHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface MenuItemSellingPriceHistoryRepository
        extends JpaRepository<MenuItemSellingPriceHistory, Long> {

    /**
     * Batch-fetches the active selling price for each item ID in the given list at the specified instant.
     * Returns one row per item (the active record). Items with no active price are absent from the result.
     *
     * Use this instead of calling findCurrentActive() in a loop to avoid N+1 queries.
     */
    @Query("""
        SELECT h FROM MenuItemSellingPriceHistory h
        WHERE h.menuItem.id IN :itemIds
          AND h.effectiveFrom <= :instant
          AND (h.effectiveTo IS NULL OR h.effectiveTo > :instant)
        """)
    List<MenuItemSellingPriceHistory> findActivePricesForItems(
            @Param("itemIds") List<Long> itemIds,
            @Param("instant") Instant instant);

    /** Convenience overload using now. */
    default List<MenuItemSellingPriceHistory> findCurrentPricesForItems(List<Long> itemIds) {
        if (itemIds == null || itemIds.isEmpty()) return List.of();
        return findActivePricesForItems(itemIds, Instant.now());
    }

    /**
     * Returns the single active selling price for a menu item at the given instant.
     * Active = effectiveFrom <= instant AND (effectiveTo IS NULL OR effectiveTo > instant).
     */
    @Query("""
        SELECT h FROM MenuItemSellingPriceHistory h
        WHERE h.menuItem.id = :menuItemId
          AND h.effectiveFrom <= :instant
          AND (h.effectiveTo IS NULL OR h.effectiveTo > :instant)
        ORDER BY h.effectiveFrom DESC
        """)
    Optional<MenuItemSellingPriceHistory> findActiveAt(
            @Param("menuItemId") Long menuItemId,
            @Param("instant") Instant instant);

    /** Returns current active price (at now). */
    default Optional<MenuItemSellingPriceHistory> findCurrentActive(Long menuItemId) {
        return findActiveAt(menuItemId, Instant.now());
    }

    /** Full price history for a menu item, most recent first. */
    @Query("""
        SELECT h FROM MenuItemSellingPriceHistory h
        WHERE h.menuItem.id = :menuItemId
        ORDER BY h.effectiveFrom DESC
        """)
    List<MenuItemSellingPriceHistory> findAllByMenuItemId(@Param("menuItemId") Long menuItemId);

    /** Closes any open (effectiveTo IS NULL) record for the given item before inserting a new price. */
    @Modifying
    @Query("""
        UPDATE MenuItemSellingPriceHistory h
        SET h.effectiveTo = :closedAt
        WHERE h.menuItem.id = :menuItemId
          AND h.effectiveTo IS NULL
        """)
    void closeActivePrices(@Param("menuItemId") Long menuItemId, @Param("closedAt") Instant closedAt);

    /**
     * Returns the latest selling price for each menu item – useful for bulk price loading.
     */
    @Query("""
        SELECT h FROM MenuItemSellingPriceHistory h
        WHERE h.effectiveFrom <= :instant
          AND (h.effectiveTo IS NULL OR h.effectiveTo > :instant)
        ORDER BY h.menuItem.id, h.effectiveFrom DESC
        """)
    List<MenuItemSellingPriceHistory> findAllActiveAt(@Param("instant") Instant instant);
}

