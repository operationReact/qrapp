package com.broandbro.qrapp.service.impl;

import com.broandbro.qrapp.dto.*;
import com.broandbro.qrapp.entity.Inventory;
import com.broandbro.qrapp.entity.InventoryAudit;
import com.broandbro.qrapp.entity.MenuItem;
import com.broandbro.qrapp.enums.*;
import com.broandbro.qrapp.exception.*;
import com.broandbro.qrapp.repository.InventoryAuditRepository;
import com.broandbro.qrapp.repository.InventoryRepository;
import com.broandbro.qrapp.repository.MenuRepository;
import com.broandbro.qrapp.service.InventoryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Implementation of InventoryService.
 *
 * Provides production-grade inventory management with:
 * - Real-time stock validation
 * - Atomic inventory deduction with pessimistic locking
 * - Comprehensive audit trail
 * - Low stock tracking
 * - Out-of-stock handling
 * - Concurrency-safe ordering
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class InventoryServiceImpl implements InventoryService {

    private final InventoryRepository inventoryRepository;
    private final InventoryAuditRepository inventoryAuditRepository;
    private final MenuRepository menuRepository;

    // ============================================================================
    // CUSTOMER-FACING METHODS
    // ============================================================================

    @Override
    @Transactional(readOnly = true)
    public StockStatus getStockStatus(Long menuItemId) {
        MenuItem menuItem = getMenuItemOrThrow(menuItemId);

        // UNLIMITED items don't have inventory tracking
        if (menuItem.getInventoryMode() == InventoryMode.UNLIMITED) {
            return StockStatus.UNLIMITED;
        }

        // For LIMITED items, check inventory
        Inventory inventory = inventoryRepository.findByMenuItemId(menuItemId)
            .orElseThrow(() -> new InventoryNotConfiguredException(menuItemId));

        if (inventory.isOutOfStock()) {
            return StockStatus.OUT_OF_STOCK;
        } else if (inventory.isLowStock()) {
            return StockStatus.LIMITED;
        } else {
            return StockStatus.AVAILABLE;
        }
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isOrderable(Long menuItemId) {
        MenuItem menuItem = getMenuItemOrThrow(menuItemId);

        // Hidden items are never orderable
        if (Boolean.TRUE.equals(menuItem.getIsHidden())) return false;

        // UNLIMITED items are always orderable when not hidden
        if (menuItem.getInventoryMode() == InventoryMode.UNLIMITED) return true;

        // LIMITED items: orderable only when quantity > 0
        return inventoryRepository.findByMenuItemId(menuItemId)
                .map(inv -> inv.getAvailableQuantity() > 0)
                .orElse(false);
    }

    @Override
    @Transactional(readOnly = true)
    public void validateQuantityAvailable(Long menuItemId, Long requestedQuantity) {
        MenuItem menuItem = getMenuItemOrThrow(menuItemId);

        // UNLIMITED items have no stock restrictions
        if (menuItem.getInventoryMode() == InventoryMode.UNLIMITED) {
            return;
        }

        // For LIMITED items, validate inventory
        Inventory inventory = inventoryRepository.findByMenuItemId(menuItemId)
            .orElseThrow(() -> new InventoryNotConfiguredException(menuItemId));

        if (!inventory.hasSufficientQuantity(requestedQuantity)) {
            log.warn("Insufficient inventory for item {}. Requested: {}, Available: {}",
                menuItemId, requestedQuantity, inventory.getAvailableQuantity());
            throw new InsufficientInventoryException(menuItemId, requestedQuantity, inventory.getAvailableQuantity());
        }
    }

    @Override
    @Transactional(readOnly = true)
    public void validateOrderItems(List<OrderItemInventoryRequest> orderItems) {
        for (OrderItemInventoryRequest item : orderItems) {
            validateQuantityAvailable(item.getMenuItemId(), item.getQuantity());
        }
    }

    // ============================================================================
    // ORDER PROCESSING METHODS (CRITICAL FOR ATOMICITY)
    // ============================================================================

    @Override
    public void deductInventory(Long menuItemId, Long quantity, String orderId) {
        MenuItem menuItem = getMenuItemOrThrow(menuItemId);

        // UNLIMITED items don't need inventory deduction
        if (menuItem.getInventoryMode() == InventoryMode.UNLIMITED) {
            log.debug("Item {} has unlimited inventory, skipping deduction", menuItemId);
            return;
        }

        // Validate quantity is positive
        if (quantity <= 0) {
            throw new InventoryOperationException("Deduction quantity must be positive");
        }

        // CRITICAL: Use pessimistic lock to prevent race conditions
        Inventory inventory = inventoryRepository.findByMenuItemIdWithLock(menuItemId)
            .orElseThrow(() -> new InventoryNotConfiguredException(menuItemId));

        // Validate sufficient quantity exists
        if (!inventory.hasSufficientQuantity(quantity)) {
            log.warn("Insufficient inventory for item {} during order deduction. Order: {}, Requested: {}, Available: {}",
                menuItemId, orderId, quantity, inventory.getAvailableQuantity());
            throw new InsufficientInventoryException(menuItemId, quantity, inventory.getAvailableQuantity());
        }

        // Store old quantity for audit
        Long oldQuantity = inventory.getAvailableQuantity();

        // Deduct quantity atomically
        inventory.setAvailableQuantity(inventory.getAvailableQuantity() - quantity);
        Long newQuantity = inventory.getAvailableQuantity();

        // Save inventory (optimistic lock will increment version)
        inventoryRepository.save(inventory);

        // Create audit entry
        createAuditEntry(
            menuItemId,
            InventoryAuditActionType.ORDER_DEDUCTION,
            oldQuantity,
            newQuantity,
            null, // system action, no user
            "Order deduction",
            orderId
        );

        log.info("Deducted inventory for item {} by quantity {}. Order: {}. New quantity: {}",
            menuItemId, quantity, orderId, newQuantity);
    }

    @Override
    public void restoreInventory(Long menuItemId, Long quantity, String orderId) {
        MenuItem menuItem = getMenuItemOrThrow(menuItemId);

        // UNLIMITED items don't need inventory restoration
        if (menuItem.getInventoryMode() == InventoryMode.UNLIMITED) {
            log.debug("Item {} has unlimited inventory, skipping restoration", menuItemId);
            return;
        }

        // Validate quantity is positive
        if (quantity <= 0) {
            throw new InventoryOperationException("Restoration quantity must be positive");
        }

        // Use pessimistic lock
        Inventory inventory = inventoryRepository.findByMenuItemIdWithLock(menuItemId)
            .orElseThrow(() -> new InventoryNotConfiguredException(menuItemId));

        // Store old quantity for audit
        Long oldQuantity = inventory.getAvailableQuantity();

        // Restore quantity atomically
        inventory.setAvailableQuantity(inventory.getAvailableQuantity() + quantity);
        Long newQuantity = inventory.getAvailableQuantity();

        // Save inventory
        inventoryRepository.save(inventory);

        // Create audit entry
        createAuditEntry(
            menuItemId,
            InventoryAuditActionType.ORDER_CANCEL_RESTORE,
            oldQuantity,
            newQuantity,
            null, // system action
            "Order cancellation restoration",
            orderId
        );

        log.info("Restored inventory for item {} by quantity {}. Order: {}. New quantity: {}",
            menuItemId, quantity, orderId, newQuantity);
    }

    // ============================================================================
    // PRIVATE HELPER METHODS
    // ============================================================================


    /**
     * Create audit entry for inventory change.
     */
    private void createAuditEntry(Long menuItemId, InventoryAuditActionType actionType,
                                   Long oldQuantity, Long newQuantity, Long changedBy,
                                   String reason, String referenceId) {
        InventoryAudit audit = InventoryAudit.builder()
            .menuItemId(menuItemId)
            .actionType(actionType)
            .oldQuantity(oldQuantity)
            .newQuantity(newQuantity)
            .changedBy(changedBy)
            .reason(reason)
            .referenceId(referenceId)
            .createdAt(Instant.now())
            .build();

        inventoryAuditRepository.save(audit);
    }

    /**
     * Get menu item or throw exception.
     */
    private MenuItem getMenuItemOrThrow(Long menuItemId) {
        return menuRepository.findById(menuItemId)
            .orElseThrow(() -> new IllegalArgumentException("Menu item not found: " + menuItemId));
    }

    // ============================================================================
    // ADMIN METHODS
    // ============================================================================

    @Override
    public InventoryStatusResponse updateInventory(InventoryUpdateRequest request, Long adminUserId) {
        MenuItem menuItem = getMenuItemOrThrow(request.getMenuItemId());

        // Only LIMITED items can have inventory updates
        if (menuItem.getInventoryMode() != InventoryMode.LIMITED) {
            throw new InventoryOperationException("Cannot update inventory for UNLIMITED items");
        }

        // Use pessimistic lock
        Inventory inventory = inventoryRepository.findByMenuItemIdWithLock(request.getMenuItemId())
            .orElseThrow(() -> new InventoryNotConfiguredException(request.getMenuItemId()));

        Long oldQuantity = inventory.getAvailableQuantity();
        Long newQuantity = oldQuantity;

        // Apply operation
        switch (request.getOperation()) {
            case ADD:
                newQuantity = oldQuantity + request.getQuantity();
                log.info("Admin {} added {} units to item {}. {} → {}",
                    adminUserId, request.getQuantity(), request.getMenuItemId(), oldQuantity, newQuantity);
                break;

            case REMOVE:
                if (request.getQuantity() > oldQuantity) {
                    throw new InventoryOperationException("Cannot remove more than available quantity");
                }
                newQuantity = oldQuantity - request.getQuantity();
                log.info("Admin {} removed {} units from item {}. {} → {}",
                    adminUserId, request.getQuantity(), request.getMenuItemId(), oldQuantity, newQuantity);
                break;

            case SET:
                if (request.getQuantity() < 0) {
                    throw new InventoryOperationException("Quantity cannot be negative");
                }
                newQuantity = request.getQuantity();
                log.info("Admin {} set quantity of item {} to {}. {} → {}",
                    adminUserId, request.getMenuItemId(), request.getQuantity(), oldQuantity, newQuantity);
                break;
        }

        // Update inventory
        inventory.setAvailableQuantity(newQuantity);
        inventoryRepository.save(inventory);

        // Create audit entry
        createAuditEntry(
            request.getMenuItemId(),
            InventoryAuditActionType.MANUAL_UPDATE,
            oldQuantity,
            newQuantity,
            adminUserId,
            request.getReason() != null ? request.getReason() : "Manual admin update",
            request.getReferenceId()
        );

        return buildInventoryStatusResponse(menuItem, inventory);
    }

    @Override
    public List<InventoryStatusResponse> bulkUpdateInventory(List<InventoryUpdateRequest> requests, Long adminUserId) {
        return requests.stream()
            .map(request -> updateInventory(request, adminUserId))
            .collect(Collectors.toList());
    }

    // setManualOrderableOverride method removed - use isHidden field instead via direct API or admin endpoint

    // ============================================================================
    // QUERY METHODS
    // ============================================================================

    @Override
    @Transactional(readOnly = true)
    public Page<InventoryStatusResponse> getLowStockItems(Pageable pageable) {
        List<Inventory> lowStockItems = inventoryRepository.findLowStockItems();

        List<InventoryStatusResponse> responses = lowStockItems.stream()
            .map(inventory -> buildInventoryStatusResponse(inventory.getMenuItem(), inventory))
            .collect(Collectors.toList());

        // Apply pagination manually since findLowStockItems doesn't support it
        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), responses.size());
        List<InventoryStatusResponse> pageContent = responses.subList(start, end);

        return new PageImpl<>(pageContent, pageable, responses.size());
    }

    @Override
    @Transactional(readOnly = true)
    public Page<InventoryStatusResponse> getOutOfStockItems(Pageable pageable) {
        List<Inventory> outOfStockItems = inventoryRepository.findOutOfStockItems();

        List<InventoryStatusResponse> responses = outOfStockItems.stream()
            .map(inventory -> buildInventoryStatusResponse(inventory.getMenuItem(), inventory))
            .collect(Collectors.toList());

        // Apply pagination manually
        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), responses.size());
        List<InventoryStatusResponse> pageContent = responses.subList(start, end);

        return new PageImpl<>(pageContent, pageable, responses.size());
    }

    @Override
    @Transactional(readOnly = true)
    public Page<InventoryAuditResponse> getInventoryAuditTrail(Long menuItemId, Pageable pageable) {
        return inventoryAuditRepository.findByMenuItemId(menuItemId, pageable)
            .map(this::buildAuditResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<InventoryAuditResponse> getRecentInventoryChanges(Pageable pageable) {
        if (pageable == null) {
            throw new IllegalArgumentException("Pageable cannot be null");
        }

        try {
            List<InventoryAudit> audits = inventoryAuditRepository.findRecentAudits(pageable);
            List<InventoryAuditResponse> responses = audits.stream()
                .map(this::buildAuditResponse)
                .collect(Collectors.toList());

            return new PageImpl<>(responses, pageable, responses.size());
        } catch (Exception e) {
            log.error("Error fetching recent inventory changes", e);
            throw new InventoryOperationException("Failed to fetch recent inventory changes: " + e.getMessage(), e);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public InventoryStatusResponse getInventoryStatus(Long menuItemId) {
        MenuItem menuItem = getMenuItemOrThrow(menuItemId);

        if (menuItem.getInventoryMode() == InventoryMode.UNLIMITED) {
            return InventoryStatusResponse.builder()
                .menuItemId(menuItemId)
                .itemName(menuItem.getName())
                .stockStatus(StockStatus.UNLIMITED)
                .available(isOrderable(menuItemId))
                .build();
        }

        Inventory inventory = inventoryRepository.findByMenuItemId(menuItemId)
            .orElseThrow(() -> new InventoryNotConfiguredException(menuItemId));

        return buildInventoryStatusResponse(menuItem, inventory);
    }

    // ============================================================================
    // RESPONSE BUILDER METHODS
    // ============================================================================

    private InventoryStatusResponse buildInventoryStatusResponse(MenuItem menuItem, Inventory inventory) {
        StockStatus status;
        if (inventory.isOutOfStock()) {
            status = StockStatus.OUT_OF_STOCK;
        } else if (inventory.isLowStock()) {
            status = StockStatus.LIMITED;
        } else {
            status = StockStatus.AVAILABLE;
        }

        return InventoryStatusResponse.builder()
            .menuItemId(menuItem.getId())
            .itemName(menuItem.getName())
            .stockStatus(status)
            .available(!Boolean.TRUE.equals(menuItem.getIsHidden()) && !inventory.isOutOfStock())
            .version(inventory.getVersion())
            .lastUpdatedAt(inventory.getLastUpdatedAt().toString())
            .build();
    }

    private InventoryAuditResponse buildAuditResponse(InventoryAudit audit) {
        MenuItem menuItem = menuRepository.findById(audit.getMenuItemId()).orElse(null);

        return InventoryAuditResponse.builder()
            .id(audit.getId())
            .menuItemId(audit.getMenuItemId())
            .itemName(menuItem != null ? menuItem.getName() : "Unknown")
            .actionType(audit.getActionType())
            .oldQuantity(audit.getOldQuantity())
            .newQuantity(audit.getNewQuantity())
            .changedBy(audit.getChangedBy())
            .reason(audit.getReason())
            .referenceId(audit.getReferenceId())
            .createdAt(audit.getCreatedAt())
            .build();
    }

    // ============================================================================
    // ADMIN INVENTORY MANAGEMENT SCREEN IMPLEMENTATIONS
    // ============================================================================

    @Override
    @Transactional(readOnly = true)
    public Page<AdminInventoryItemResponse> getInventoryItems(InventoryItemFilter filter, Pageable pageable) {
        String search       = (filter.getSearch() != null && !filter.getSearch().isBlank())
                              ? filter.getSearch().trim() : null;
        boolean lowStockOnly = Boolean.TRUE.equals(filter.getLowStockOnly());

        return inventoryRepository.findLimitedItemsWithFilters(
                        filter.getInventoryMode(),
                        search,
                        filter.getIsHidden(),
                        Boolean.TRUE.equals(filter.getInStockOnly()),
                        lowStockOnly,
                        pageable)
                .map(this::toAdminInventoryItemResponse);
    }

    /**
     * Unified update: applies only non-null fields in one transaction.
     *
     * Dependency rule:
     *   quantity present  → isItemInStock AUTO-DERIVED  (qty > 0 = true, 0 = false)
     *   quantity absent   → isItemInStock applied as manual override if present
     */
    @Override
    @Transactional
    public AdminInventoryItemResponse updateItem(Long menuItemId,
                                                  AdminInventoryUpdateRequest request,
                                                  String changedByName) {
        MenuItem menuItem = getMenuItemOrThrow(menuItemId);
        boolean menuItemDirty = false;

        // ------------------------------------------------------------------
        // 1. QUANTITY  (+ auto-derive isItemInStock)
        // ------------------------------------------------------------------
        if (request.getQuantity() != null) {
            if (menuItem.getInventoryMode() != InventoryMode.LIMITED) {
                throw new InventoryOperationException(
                        "Cannot set quantity for item with inventoryMode = " + menuItem.getInventoryMode());
            }

            Inventory inventory = inventoryRepository.findByMenuItemIdWithLock(menuItemId)
                    .orElseThrow(() -> new InventoryNotConfiguredException(menuItemId));

            Long oldQty = inventory.getAvailableQuantity();
            Long newQty = request.getQuantity();
            inventory.setAvailableQuantity(newQty);
            inventoryRepository.save(inventory);


            createNamedAuditEntry(menuItemId, InventoryAuditActionType.SET_QUANTITY,
                    oldQty, newQty, changedByName,
                    request.getReason() != null ? request.getReason() : "Admin set quantity");

            log.info("Admin [{}] set quantity for item {} : {} → {}", changedByName, menuItemId, oldQty, newQty);
        }

        // ------------------------------------------------------------------
        // 2. LOW STOCK THRESHOLD
        // ------------------------------------------------------------------
        if (request.getLowStockThreshold() != null) {
            if (menuItem.getInventoryMode() != InventoryMode.LIMITED) {
                throw new InventoryOperationException(
                        "Cannot set low stock threshold for UNLIMITED item");
            }
            Inventory inventory = inventoryRepository.findByMenuItemIdWithLock(menuItemId)
                    .orElseThrow(() -> new InventoryNotConfiguredException(menuItemId));
            inventory.setLowStockThreshold(request.getLowStockThreshold());
            inventoryRepository.save(inventory);
            log.info("Admin [{}] updated lowStockThreshold for item {} to {}",
                    changedByName, menuItemId, request.getLowStockThreshold());
        }

        // ------------------------------------------------------------------
        // 3. VISIBILITY
        // ------------------------------------------------------------------
        if (request.getIsHidden() != null) {
            boolean oldHidden = Boolean.TRUE.equals(menuItem.getIsHidden());
            boolean newHidden = request.getIsHidden();
            menuItem.setIsHidden(newHidden);
            menuItemDirty = true;

            createNamedAuditEntry(menuItemId, InventoryAuditActionType.VISIBILITY_CHANGE,
                    oldHidden ? 1L : 0L, newHidden ? 1L : 0L, changedByName,
                    newHidden ? "Item hidden by admin" : "Item unhidden by admin");

            log.info("Admin [{}] set isHidden={} for item {}", changedByName, newHidden, menuItemId);
        }

        if (menuItemDirty) {
            menuRepository.save(menuItem);
        }

        // Return fresh snapshot
        return inventoryRepository.findByMenuItemId(menuItemId)
                .map(this::toAdminInventoryItemResponse)
                .orElseGet(() -> buildResponseWithoutInventory(menuItem));
    }

    // ============================================================================
    // PRIVATE HELPERS FOR ADMIN METHODS
    // ============================================================================

    private void createNamedAuditEntry(Long menuItemId, InventoryAuditActionType actionType,
                                       Long oldQuantity, Long newQuantity,
                                       String changedByName, String reason) {
        InventoryAudit audit = InventoryAudit.builder()
                .menuItemId(menuItemId)
                .actionType(actionType)
                .oldQuantity(oldQuantity)
                .newQuantity(newQuantity)
                .changedByName(changedByName)
                .reason(reason)
                .createdAt(Instant.now())
                .build();
        inventoryAuditRepository.save(audit);
    }

    private AdminInventoryItemResponse toAdminInventoryItemResponse(Inventory inventory) {
        MenuItem m = inventory.getMenuItem();
        boolean hidden = Boolean.TRUE.equals(m.getIsHidden());
        boolean orderable = !hidden && inventory.getAvailableQuantity() > 0;
        return AdminInventoryItemResponse.builder()
                .menuItemId(m.getId())
                .itemName(m.getName())
                .availableQuantity(inventory.getAvailableQuantity())
                .lowStockThreshold(inventory.getLowStockThreshold())
                .isLowStock(inventory.isLowStock())
                .isHidden(hidden)
                .isOrderable(orderable)
                .version(inventory.getVersion())
                .updatedAt(inventory.getLastUpdatedAt())
                .build();
    }

    private AdminInventoryItemResponse buildResponseWithoutInventory(MenuItem m) {
        boolean hidden = Boolean.TRUE.equals(m.getIsHidden());
        return AdminInventoryItemResponse.builder()
                .menuItemId(m.getId())
                .itemName(m.getName())
                .isHidden(hidden)
                // UNLIMITED items are always orderable when not hidden
                .isOrderable(!hidden)
                .build();
    }
}

