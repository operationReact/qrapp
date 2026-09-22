package com.broandbro.qrapp.controller;

import com.broandbro.qrapp.dto.*;
import com.broandbro.qrapp.entity.User;
import com.broandbro.qrapp.enums.InventoryMode;
import com.broandbro.qrapp.service.InventoryService;
import com.broandbro.qrapp.service.LocationAccessService;
import com.broandbro.qrapp.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

/**
 * Admin-only REST controller for the Inventory Management screen.
 *
 * Base path : /admin/inventory
 * Auth      : ROLE_ADMIN or ROLE_SUPERUSER
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ GET  /admin/inventory/items          – filtered, paginated item list    │
 * │ PATCH /admin/inventory/{id}          – unified partial update           │
 * │ GET  /admin/inventory/{id}/audit     – audit trail for one item         │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Filter matrix for GET /admin/inventory/items:
 *
 *   ?search=biryani          → name contains "biryani" (case-insensitive)
 *   ?isHidden=true           → only hidden items
 *   ?isItemInStock=false     → only out-of-stock items
 *   ?lowStockOnly=true       → only items where qty <= threshold
 *   (all filters combinable, all optional)
 *
 * Update rules for PATCH /admin/inventory/{id}:
 *
 *   quantity provided        → isItemInStock AUTO-DERIVED (qty > 0 = true)
 *   quantity absent +
 *     isItemInStock provided → manual override (kitchen issue / pause)
 *   isHidden provided        → visibility toggled independently
 *   lowStockThreshold        → alert threshold updated
 *   (all fields optional, only non-null fields are applied)
 */
@RestController
@RequestMapping("/admin/inventory")
@RequiredArgsConstructor
@Validated
@Slf4j
@PreAuthorize("hasAnyRole('ADMIN', 'SUPERUSER', 'SUPER_ADMIN', 'MANAGER')")
public class AdminInventoryController {

    private final InventoryService inventoryService;
    private final LocationAccessService locationAccessService;
    private final UserService userService;

    // =========================================================================
    // GET /admin/inventory/items
    // =========================================================================

    /**
     * Fetch LIMITED inventory items for the admin management screen.
     *
     * All query params are optional and combinable:
     *
     * @param search        partial name match (case-insensitive)
     * @param isHidden      filter by hidden state
     * @param inStockOnly filter by stock state
     * @param lowStockOnly  when true, only items below their low-stock threshold
     * @param page          0-based page index (default 0)
     * @param size          page size (default 20, max 100)
     * @param sort          "field,direction"  e.g. "updatedAt,desc"
     *                      Supported fields: updatedAt | availableQuantity | itemName
     */
    @GetMapping("/items")
    public ResponseEntity<Page<AdminInventoryItemResponse>> getInventoryItems(
            @RequestParam(required = false)                        String        search,
            @RequestParam(required = false)                        InventoryMode inventoryMode,
            @RequestParam(required = false)                        Boolean       isHidden,
            @RequestParam(required = false, defaultValue = "false") boolean      inStockOnly,
            @RequestParam(required = false, defaultValue = "false") boolean      lowStockOnly,
            @RequestParam(required = false)                        Long          locationId,
            @RequestParam(defaultValue = "0")                      int           page,
            @RequestParam(defaultValue = "20")                     int           size,
            @RequestParam(defaultValue = "quantity,asc")         String        sort,
            Authentication authentication) {

        User user = requireUser(authentication);
        locationAccessService.requireNonKitchenAdmin(user);
        Optional<List<Long>> scope = locationAccessService.resolveDashboardLocationScope(user, locationId);

        InventoryItemFilter filter = new InventoryItemFilter();
        filter.setSearch(search);
        filter.setInventoryMode(inventoryMode);
        filter.setIsHidden(isHidden);
        filter.setInStockOnly(inStockOnly);
        filter.setLowStockOnly(lowStockOnly);

        Pageable pageable = buildPageable(page, size, sort);
        return ResponseEntity.ok(inventoryService.getInventoryItems(filter, pageable, scope));
    }

    // =========================================================================
    // PATCH /admin/inventory/{menuItemId}
    // =========================================================================

    /**
     * Unified partial update for a menu item's inventory state.
     *
     * Send only the fields you want to change — all are optional:
     *
     * <pre>
     * {
     *   "quantity":          25,               // set exact qty; auto-derives isItemInStock
     *   "lowStockThreshold": 5,                // update alert threshold
     *   "isItemInStock":     false,            // manual override (only when quantity omitted)
     *   "isHidden":          true,             // show / hide item
     *   "reason":            "Morning refill"  // audit note
     * }
     * </pre>
     *
     * Dependency rule:
     *   quantity present  → isItemInStock is AUTO-DERIVED. Any isItemInStock value
     *                        in the request body is intentionally ignored.
     *   quantity absent   → isItemInStock applied as manual override if present.
     *
     * Each modified field generates its own audit record in the same transaction.
     */
    @PatchMapping("/{menuItemId}")
    public ResponseEntity<AdminInventoryItemResponse> updateItem(
            @PathVariable Long menuItemId,
            @Valid @RequestBody AdminInventoryUpdateRequest request,
            Authentication authentication) {

        User user = requireUser(authentication);
        requireMenuItemLocationAccess(user, menuItemId);

        String changedBy = extractUsername(authentication);
        log.info("Admin [{}] updating inventory item={} request={}", changedBy, menuItemId, request);

        AdminInventoryItemResponse response =
                inventoryService.updateItem(menuItemId, request, changedBy);
        return ResponseEntity.ok(response);
    }

    // =========================================================================
    // GET /admin/inventory/{menuItemId}/audit
    // =========================================================================

    /**
     * Fetch the full audit trail for one menu item, newest entry first.
     */
    @GetMapping("/{menuItemId}/audit")
    public ResponseEntity<Page<InventoryAuditResponse>> getAuditTrail(
            @PathVariable Long menuItemId,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication authentication) {

        User user = requireUser(authentication);
        requireMenuItemLocationAccess(user, menuItemId);

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return ResponseEntity.ok(inventoryService.getInventoryAuditTrail(menuItemId, pageable));
    }

    // =========================================================================
    // HELPERS
    // =========================================================================

    private String extractUsername(Authentication authentication) {
        if (authentication != null && authentication.isAuthenticated()) {
            return authentication.getName();
        }
        return "system";
    }

    private User requireUser(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            throw new AccessDeniedException("authentication_required");
        }
        return userService.findByPhone(authentication.getName())
                .orElseThrow(() -> new AccessDeniedException("authentication_required"));
    }

    /** Ensures the caller may manage the location that owns the given menu item. */
    private void requireMenuItemLocationAccess(User user, Long menuItemId) {
        locationAccessService.requireNonKitchenAdmin(user);
        Long locationId = inventoryService.getMenuItemLocationId(menuItemId);
        locationAccessService.requireLocationAccess(user, locationId);
    }

    private Pageable buildPageable(int page, int size, String sort) {
        int cappedSize = Math.min(size, 100);
        return PageRequest.of(page, cappedSize, parseSort(sort));
    }

    private Sort parseSort(String sortParam) {
        if (sortParam == null || sortParam.isBlank()) {
            return Sort.by(Sort.Direction.DESC, "lastUpdatedAt");
        }
        String[] parts  = sortParam.split(",");
        String   field  = parts[0].trim();
        Sort.Direction dir = (parts.length > 1 && "asc".equalsIgnoreCase(parts[1].trim()))
                             ? Sort.Direction.ASC : Sort.Direction.DESC;

        // map API names → JPA entity field paths
        String entityField = switch (field) {
            case "updatedAt", "lastUpdatedAt" -> "lastUpdatedAt";
            case "availableQuantity"           -> "availableQuantity";
            case "itemName"                    -> "menuItem.name";
            default                            -> "lastUpdatedAt";
        };
        return Sort.by(dir, entityField);
    }
}

