package com.broandbro.qrapp.controller;

import com.broandbro.qrapp.dto.*;
import com.broandbro.qrapp.entity.User;
import com.broandbro.qrapp.exception.InsufficientInventoryException;
import com.broandbro.qrapp.service.InventoryService;
import com.broandbro.qrapp.service.LocationAccessService;
import com.broandbro.qrapp.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.cache.annotation.CacheEvict;

import jakarta.validation.Valid;
import java.util.List;
import java.util.Optional;

/**
 * REST API for inventory management.
 *
 * Endpoints:
 * - Customer: Check stock status, validate quantities
 * - Admin: Manage inventory, view audit trail
 * - Internal: Deduct/restore inventory during order processing
 */
@RestController
@RequestMapping("/api/v1/inventory")
@RequiredArgsConstructor
@Validated
@Slf4j
public class InventoryController {

    private final InventoryService inventoryService;
    private final LocationAccessService locationAccessService;
    private final UserService userService;

    // ============================================================================
    // CUSTOMER ENDPOINTS (PUBLIC)
    // ============================================================================

    /**
     * Get stock status for a menu item (public, no exact quantities exposed).
     *
     * GET /api/v1/inventory/items/{menuItemId}/stock-status
     */
    @GetMapping("/items/{menuItemId}/stock-status")
    public ResponseEntity<?> getStockStatus(@PathVariable Long menuItemId) {
        try {
            var stockStatus = inventoryService.getStockStatus(menuItemId);
            return ResponseEntity.ok(stockStatus);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        }
    }

    /**
     * Check if item is currently orderable.
     *
     * GET /api/v1/inventory/items/{menuItemId}/orderable
     */
    @GetMapping("/items/{menuItemId}/orderable")
    public ResponseEntity<?> isOrderable(@PathVariable Long menuItemId) {
        try {
            boolean orderable = inventoryService.isOrderable(menuItemId);
            return ResponseEntity.ok().body(Map.of("orderable", orderable, "available", orderable));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        }
    }

    /**
     * Validate single item quantity.
     *
     * POST /api/v1/inventory/validate/quantity
     */
    @PostMapping("/validate/quantity")
    public ResponseEntity<?> validateQuantity(@Valid @RequestBody OrderItemInventoryRequest request) {
        try {
            inventoryService.validateQuantityAvailable(request.getMenuItemId(), request.getQuantity());
            return ResponseEntity.ok().body(Map.of("valid", true));
        } catch (InsufficientInventoryException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                "error", "Insufficient inventory",
                "available", e.getAvailableQuantity(),
                "requested", e.getRequestedQuantity()
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        }
    }

    /**
     * Validate multiple items (useful for cart checkout).
     *
     * POST /api/v1/inventory/validate/cart
     */
    @PostMapping("/validate/cart")
    public ResponseEntity<?> validateCart(@Valid @RequestBody List<OrderItemInventoryRequest> items) {
        try {
            inventoryService.validateOrderItems(items);
            return ResponseEntity.ok().body(Map.of("valid", true, "itemsCount", items.size()));
        } catch (InsufficientInventoryException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                "error", "Insufficient inventory",
                "menuItemId", e.getMenuItemId(),
                "available", e.getAvailableQuantity(),
                "requested", e.getRequestedQuantity()
            ));
        }
    }

    // ============================================================================
    // INTERNAL ENDPOINTS (Order processing)
    // ============================================================================

    /**
     * Deduct inventory when order is placed.
     *
     * INTERNAL ONLY: Called by OrderService during checkout
     * Must be called within order transaction
     *
     * POST /api/v1/inventory/deduct
     */
    @PostMapping("/deduct")
    @CacheEvict(cacheNames = {"menu", "menuRecommended"}, allEntries = true)
    @PreAuthorize("hasRole('ADMIN') or isAuthenticated()")
    public ResponseEntity<?> deductInventory(
            @Valid @RequestBody OrderItemInventoryRequest request,
            @RequestParam(required = false) String orderId) {
        try {
            inventoryService.deductInventory(request.getMenuItemId(), request.getQuantity(), orderId);
            return ResponseEntity.ok().body(Map.of(
                "success", true,
                "message", "Inventory deducted successfully"
            ));
        } catch (InsufficientInventoryException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                "error", "Insufficient inventory",
                "available", e.getAvailableQuantity(),
                "requested", e.getRequestedQuantity()
            ));
        } catch (Exception e) {
            log.error("Error deducting inventory", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "error", e.getMessage()
            ));
        }
    }

    /**
     * Restore inventory when order is cancelled.
     *
     * INTERNAL ONLY: Called by OrderService during cancellation
     *
     * POST /api/v1/inventory/restore
     */
    @PostMapping("/restore")
    @CacheEvict(cacheNames = {"menu", "menuRecommended"}, allEntries = true)
    @PreAuthorize("hasRole('ADMIN') or isAuthenticated()")
    public ResponseEntity<?> restoreInventory(
            @Valid @RequestBody OrderItemInventoryRequest request,
            @RequestParam(required = false) String orderId) {
        try {
            inventoryService.restoreInventory(request.getMenuItemId(), request.getQuantity(), orderId);
            return ResponseEntity.ok().body(Map.of(
                "success", true,
                "message", "Inventory restored successfully"
            ));
        } catch (Exception e) {
            log.error("Error restoring inventory", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "error", e.getMessage()
            ));
        }
    }

    // ============================================================================
    // ADMIN ENDPOINTS
    // ============================================================================

    /**
     * Update inventory (admin only).
     *
     * Supports ADD, REMOVE, SET operations with audit trail.
     *
     * PUT /api/v1/inventory/update
     */
    @PutMapping("/update")
    @CacheEvict(cacheNames = {"menu", "menuRecommended"}, allEntries = true)
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateInventory(
            @Valid @RequestBody InventoryUpdateRequest request,
            Authentication authentication) {
        try {
            Long adminUserId = extractUserId(authentication);
            var response = inventoryService.updateInventory(request, adminUserId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error updating inventory", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                "error", e.getMessage()
            ));
        }
    }

    /**
     * Bulk update inventory (admin only).
     *
     * PUT /api/v1/inventory/bulk-update
     */
    @PutMapping("/bulk-update")
    @CacheEvict(cacheNames = {"menu", "menuRecommended"}, allEntries = true)
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> bulkUpdateInventory(
            @Valid @RequestBody List<InventoryUpdateRequest> requests,
            Authentication authentication) {
        try {
            Long adminUserId = extractUserId(authentication);
            var responses = inventoryService.bulkUpdateInventory(requests, adminUserId);
            return ResponseEntity.ok(Map.of(
                "success", true,
                "updated", responses.size(),
                "items", responses
            ));
        } catch (Exception e) {
            log.error("Error in bulk update", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                "error", e.getMessage()
            ));
        }
    }

    /**
     * Get all low stock items (admin only).
     *
     * GET /api/v1/inventory/low-stock
     */
    @GetMapping("/low-stock")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'MANAGER')")
    public ResponseEntity<?> getLowStockItems(@RequestParam(required = false) Long locationId,
                                              Authentication authentication,
                                              Pageable pageable) {
        try {
            Optional<List<Long>> scope = resolveAdminScope(authentication, locationId);
            var items = inventoryService.getLowStockItems(pageable, scope);
            return ResponseEntity.ok(items);
        } catch (Exception e) {
            log.error("Error fetching low stock items", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "error", e.getMessage()
            ));
        }
    }

    /**
     * Get all out of stock items (admin only).
     *
     * GET /api/v1/inventory/out-of-stock
     */
    @GetMapping("/out-of-stock")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'MANAGER')")
    public ResponseEntity<?> getOutOfStockItems(@RequestParam(required = false) Long locationId,
                                                Authentication authentication,
                                                Pageable pageable) {
        try {
            Optional<List<Long>> scope = resolveAdminScope(authentication, locationId);
            var items = inventoryService.getOutOfStockItems(pageable, scope);
            return ResponseEntity.ok(items);
        } catch (Exception e) {
            log.error("Error fetching out of stock items", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "error", e.getMessage()
            ));
        }
    }

    /**
     * Get inventory audit trail for an item (admin only).
     *
     * GET /api/v1/inventory/items/{menuItemId}/audit
     */
    @GetMapping("/items/{menuItemId}/audit")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'MANAGER')")
    public ResponseEntity<?> getAuditTrail(@PathVariable Long menuItemId,
                                           Authentication authentication,
                                           Pageable pageable) {
        try {
            requireMenuItemLocationAccess(authentication, menuItemId);
            var audit = inventoryService.getInventoryAuditTrail(menuItemId, pageable);
            return ResponseEntity.ok(audit);
        } catch (AccessDeniedException e) {
            throw e;
        } catch (Exception e) {
            log.error("Error fetching audit trail", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "error", e.getMessage()
            ));
        }
    }

    /**
     * Get recent inventory changes (admin only).
     *
     * GET /api/v1/inventory/audit/recent
     */
    @GetMapping("/audit/recent")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'MANAGER')")
    public ResponseEntity<?> getRecentChanges(@RequestParam(required = false) Long locationId,
                                              Authentication authentication,
                                              Pageable pageable) {
        try {
            Optional<List<Long>> scope = resolveAdminScope(authentication, locationId);
            var changes = inventoryService.getRecentInventoryChanges(pageable, scope);
            return ResponseEntity.ok(changes);
        } catch (Exception e) {
            log.error("Error fetching recent changes", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "error", e.getMessage()
            ));
        }
    }

    /**
     * Get inventory status (admin only).
     *
     * GET /api/v1/inventory/items/{menuItemId}/status
     */
    @GetMapping("/items/{menuItemId}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'MANAGER')")
    public ResponseEntity<?> getInventoryStatus(@PathVariable Long menuItemId,
                                                Authentication authentication) {
        try {
            requireMenuItemLocationAccess(authentication, menuItemId);
            var status = inventoryService.getInventoryStatus(menuItemId);
            return ResponseEntity.ok(status);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        }
    }


    /**
     * Set Manual Orderable Override endpoint removed.
     * Use menu item management API to set isHidden field instead.
     */

    // ============================================================================
    // HELPER METHODS
    // ============================================================================

    private Long extractUserId(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new IllegalArgumentException("User not authenticated");
        }
        // In your actual system, extract user ID from authentication
        // This is a placeholder - adjust based on your auth implementation
        return 1L; // TODO: Extract from security context
    }

    private User requireUser(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            throw new AccessDeniedException("authentication_required");
        }
        return userService.findByPhone(authentication.getName())
                .orElseThrow(() -> new AccessDeniedException("authentication_required"));
    }

    /** Resolves the caller's dashboard location scope for admin inventory reads. */
    private Optional<List<Long>> resolveAdminScope(Authentication authentication, Long locationId) {
        User user = requireUser(authentication);
        locationAccessService.requireNonKitchenAdmin(user);
        return locationAccessService.resolveDashboardLocationScope(user, locationId);
    }

    /** Ensures the caller may access the location that owns the given menu item. */
    private void requireMenuItemLocationAccess(Authentication authentication, Long menuItemId) {
        User user = requireUser(authentication);
        locationAccessService.requireNonKitchenAdmin(user);
        Long locationId = inventoryService.getMenuItemLocationId(menuItemId);
        locationAccessService.requireLocationAccess(user, locationId);
    }

    // For Java 17+ Map convenience
    private static class Map {
        public static java.util.Map<String, Object> of(Object... args) {
            java.util.Map<String, Object> map = new java.util.LinkedHashMap<>();
            for (int i = 0; i < args.length; i += 2) {
                map.put((String) args[i], args[i + 1]);
            }
            return map;
        }
    }
}
