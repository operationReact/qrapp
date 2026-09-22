package com.broandbro.qrapp.repository;

import com.broandbro.qrapp.entity.Inventory;
import com.broandbro.qrapp.enums.InventoryMode;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository for Inventory entity.
 *
 * Provides:
 * - Pessimistic locking for atomic inventory operations
 * - Efficient queries for inventory checks
 * - Low stock detection
 */
@Repository
public interface InventoryRepository extends JpaRepository<Inventory, Long> {

    /**
     * Find inventory for a menu item with pessimistic write lock.
     *
     * CRITICAL: Use this for order placement to prevent race conditions.
     *
     * Behavior:
     * - Locks the row until transaction commits
     * - Other threads wait for lock
     * - Prevents concurrent overselling
     *
     * @param menuItemId menu item ID
     * @return locked inventory record, empty if not found
     * @throws org.springframework.dao.CannotAcquireLockException if lock acquisition timeout
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT i FROM Inventory i WHERE i.menuItem.id = :menuItemId")
    Optional<Inventory> findByMenuItemIdWithLock(@Param("menuItemId") Long menuItemId);

    /**
     * Find inventory for a menu item without locking (for read-only operations).
     *
     * @param menuItemId menu item ID
     * @return inventory record, empty if not found
     */
    @Query("SELECT i FROM Inventory i WHERE i.menuItem.id = :menuItemId")
    Optional<Inventory> findByMenuItemId(@Param("menuItemId") Long menuItemId);

    /**
     * Find all low stock inventory items.
     *
     * Low stock = available quantity <= low stock threshold
     *
     * @return list of low stock items
     */
    @Query("""
        SELECT i FROM Inventory i 
        WHERE i.availableQuantity <= i.lowStockThreshold
        ORDER BY i.availableQuantity ASC
        """)
    List<Inventory> findLowStockItems();

    /**
     * Location-scoped low stock items.
     *
     * <p>Follows the dashboard scope contract used across the admin surfaces:
     * {@code allLocations = true} disables the location filter (SUPER_ADMIN /
     * "All Locations"); otherwise items are restricted to {@code locationIds}
     * (via the owning MenuItem's location). {@code locationIds} must never be
     * empty (use a sentinel such as {@code -1}) so the {@code IN} clause parses.</p>
     */
    @Query("""
        SELECT i FROM Inventory i 
        WHERE i.availableQuantity <= i.lowStockThreshold
        AND (:allLocations = TRUE OR i.menuItem.location.id IN :locationIds)
        ORDER BY i.availableQuantity ASC
        """)
    List<Inventory> findLowStockItems(@Param("allLocations") boolean allLocations,
                                      @Param("locationIds") List<Long> locationIds);

    /**
     * Find all out of stock items.
     *
     * Out of stock = available quantity <= 0
     *
     * @return list of out of stock items
     */
    @Query("""
        SELECT i FROM Inventory i 
        WHERE i.availableQuantity <= 0
        """)
    List<Inventory> findOutOfStockItems();

    /**
     * Location-scoped out of stock items. See {@link #findLowStockItems(boolean, List)}
     * for the scope contract.
     */
    @Query("""
        SELECT i FROM Inventory i 
        WHERE i.availableQuantity <= 0
        AND (:allLocations = TRUE OR i.menuItem.location.id IN :locationIds)
        """)
    List<Inventory> findOutOfStockItems(@Param("allLocations") boolean allLocations,
                                        @Param("locationIds") List<Long> locationIds);

    /**
     * Find inventories by menu item IDs.
     * Useful for bulk operations.
     *
     * @param menuItemIds list of menu item IDs
     * @return list of inventory records
     */
    @Query("SELECT i FROM Inventory i WHERE i.menuItem.id IN :menuItemIds")
    List<Inventory> findByMenuItemIds(@Param("menuItemIds") List<Long> menuItemIds);

    /**
     * Check if inventory exists for a menu item.
     *
     * @param menuItemId menu item ID
     * @return true if inventory exists
     */
    boolean existsByMenuItemId(Long menuItemId);

    /**
     * Count low stock items.
     *
     * @return count of items at or below low stock threshold
     */
    @Query("""
        SELECT COUNT(i) FROM Inventory i 
        WHERE i.availableQuantity <= i.lowStockThreshold
        """)
    long countLowStockItems();

    /**
     * Unified filtered query for the admin inventory management screen.
     *
     * All filter params are optional (null = no restriction):
     *   inventoryMode – filter by InventoryMode enum value (LIMITED / UNLIMITED)
     *   search        – case-insensitive partial match on menu item name
     *   isHidden      – filter by MenuItem.isHidden
     *   isItemInStock – filter by MenuItem.isItemInStock
     *   lowStockOnly  – when true, only LIMITED items where availableQty <= threshold
     *
     * Uses JOIN FETCH to avoid N+1 reads on MenuItem.
     * Note: UNLIMITED items have no inventory row — only LIMITED items appear in this table.
     */
    @Query("""
        SELECT i FROM Inventory i
        JOIN FETCH i.menuItem m
        WHERE (:inventoryMode IS NULL OR m.inventoryMode = :inventoryMode)
        AND (:search        IS NULL OR LOWER(m.name)       LIKE CONCAT('%', LOWER(CAST(:search AS string)), '%'))
        AND (:isHidden      IS NULL OR m.isHidden           = :isHidden)
        AND (:inStockOnly   = false  OR i.availableQuantity > 0)
        AND (:lowStockOnly  = false  OR i.availableQuantity <= i.lowStockThreshold)
        AND (:allLocations  = TRUE   OR m.location.id IN :locationIds)
        """)
    Page<Inventory> findLimitedItemsWithFilters(
            @Param("inventoryMode") InventoryMode inventoryMode,
            @Param("search")        String        search,
            @Param("isHidden")      Boolean       isHidden,
            @Param("inStockOnly")   boolean       inStockOnly,
            @Param("lowStockOnly")  boolean       lowStockOnly,
            @Param("allLocations")  boolean       allLocations,
            @Param("locationIds")   List<Long>    locationIds,
            Pageable pageable);
}
