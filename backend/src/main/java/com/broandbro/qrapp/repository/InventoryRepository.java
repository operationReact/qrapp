package com.broandbro.qrapp.repository;

import com.broandbro.qrapp.entity.Inventory;
import jakarta.persistence.LockModeType;
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
     * Count out of stock items.
     *
     * @return count of out of stock items
     */
    @Query("""
        SELECT COUNT(i) FROM Inventory i 
        WHERE i.availableQuantity <= 0
        """)
    long countOutOfStockItems();
}

