package com.broandbro.qrapp.service;

import com.broandbro.qrapp.dto.*;
import com.broandbro.qrapp.enums.InventoryOperation;
import com.broandbro.qrapp.enums.StockStatus;
import com.broandbro.qrapp.exception.InsufficientInventoryException;
import com.broandbro.qrapp.exception.InventoryNotConfiguredException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

/**
 * Service interface for inventory management.
 *
 * Responsibilities:
 * - Inventory validation
 * - Stock status calculation
 * - Admin inventory updates with audit trail
 * - Low stock alerts
 * - Order-time inventory deduction
 * - Orderable status management
 *
 * All operations are transactional and include proper locking for concurrency safety.
 */
public interface InventoryService {

    // ============================================================================
    // CUSTOMER-FACING METHODS
    // ============================================================================

    /**
     * Get stock status for display to customers.
     *
     * Does NOT expose exact quantities.
     *
     * @param menuItemId menu item ID
     * @return stock status (AVAILABLE, LIMITED, OUT_OF_STOCK, UNLIMITED)
     */
    StockStatus getStockStatus(Long menuItemId);

    /**
     * Check if item is currently orderable.
     *
     * @param menuItemId menu item ID
     * @return true if item can be ordered
     */
    boolean isOrderable(Long menuItemId);

    /**
     * Validate if requested quantity is available.
     *
     * Throws InsufficientInventoryException if not available.
     *
     * @param menuItemId menu item ID
     * @param requestedQuantity quantity requested
     * @throws InsufficientInventoryException if insufficient stock
     */
    void validateQuantityAvailable(Long menuItemId, Long requestedQuantity);

    /**
     * Validate multiple order items at once.
     * Useful for cart checkout.
     *
     * @param orderItems items to validate
     * @throws InsufficientInventoryException if any item has insufficient stock
     */
    void validateOrderItems(List<OrderItemInventoryRequest> orderItems);

    // ============================================================================
    // ORDER PROCESSING METHODS
    // ============================================================================

    /**
     * Deduct inventory when order is placed.
     *
     * CRITICAL: Must be called within order transaction.
     * Uses pessimistic locking to prevent race conditions.
     *
     * Flow:
     * 1. Lock inventory row
     * 2. Validate quantity
     * 3. Deduct quantity
     * 4. Update orderable status if needed
     * 5. Create audit entry
     * 6. Return (transaction commits or rolls back atomically)
     *
     * @param menuItemId menu item ID
     * @param quantity to deduct
     * @param orderId reference to order being placed
     * @throws InsufficientInventoryException if insufficient stock
     * @throws InventoryNotConfiguredException if item doesn't have inventory
     */
    void deductInventory(Long menuItemId, Long quantity, String orderId);

    /**
     * Restore inventory when order is cancelled.
     *
     * @param menuItemId menu item ID
     * @param quantity to restore
     * @param orderId reference to cancelled order
     */
    void restoreInventory(Long menuItemId, Long quantity, String orderId);

    // ============================================================================
    // ADMIN METHODS
    // ============================================================================

    /**
     * Update inventory with audit trail.
     *
     * Supports ADD, REMOVE, SET operations.
     *
     * @param request update request with operation, quantity, reason
     * @param adminUserId admin user performing the update
     * @return updated inventory status
     */
    InventoryStatusResponse updateInventory(InventoryUpdateRequest request, Long adminUserId);

    /**
     * Bulk update inventory for multiple items.
     *
     * Useful for:
     * - Opening/closing stock
     * - Warehouse sync
     * - Batch imports
     *
     * @param requests list of inventory updates
     * @param adminUserId admin user performing the update
     * @return list of updated inventory statuses
     */
    List<InventoryStatusResponse> bulkUpdateInventory(List<InventoryUpdateRequest> requests, Long adminUserId);


    // ============================================================================
    // QUERY METHODS
    // ============================================================================

    /**
     * Get all low stock items.
     *
     * Low stock = available quantity <= low stock threshold
     *
     * @param pageable pagination info
     * @return paginated list of low stock items
     */
    Page<InventoryStatusResponse> getLowStockItems(Pageable pageable);

    /**
     * Get all out of stock items.
     *
     * @param pageable pagination info
     * @return paginated list of out of stock items
     */
    Page<InventoryStatusResponse> getOutOfStockItems(Pageable pageable);

    /**
     * Get inventory audit trail for a menu item.
     *
     * @param menuItemId menu item ID
     * @param pageable pagination info
     * @return paginated audit entries
     */
    Page<InventoryAuditResponse> getInventoryAuditTrail(Long menuItemId, Pageable pageable);

    /**
     * Get recent inventory changes across all items.
     *
     * @param pageable pagination info
     * @return paginated recent audit entries
     */
    Page<InventoryAuditResponse> getRecentInventoryChanges(Pageable pageable);

    /**
     * Get inventory status for display in menu response.
     *
     * @param menuItemId menu item ID
     * @return inventory status with safe public info
     */
    InventoryStatusResponse getInventoryStatus(Long menuItemId);

    // ============================================================================
    // ADMIN INVENTORY MANAGEMENT SCREEN METHODS
    // ============================================================================

    /**
     * Fetch paginated list of LIMITED inventory items with optional filters.
     *
     * @param filter  search / isHidden / isItemInStock / lowStockOnly flags
     * @param pageable pagination and sorting
     * @return paginated admin inventory items
     */
    Page<AdminInventoryItemResponse> getInventoryItems(InventoryItemFilter filter, Pageable pageable);

    /**
     * Unified update for a menu item's inventory state.
     *
     * Only non-null fields in {@code request} are applied.
     *
     * Dependency rule:
     *   - quantity provided   → isItemInStock is AUTO-DERIVED (quantity > 0 = true)
     *   - only isItemInStock  → manual override (kitchen issue etc.)
     *
     * Each changed field creates its own audit entry within the same transaction.
     *
     * @param menuItemId    target item
     * @param request       partial update payload
     * @param changedByName authenticated admin username / phone
     * @return updated admin inventory item response
     */
    AdminInventoryItemResponse updateItem(Long menuItemId, AdminInventoryUpdateRequest request, String changedByName);
}

