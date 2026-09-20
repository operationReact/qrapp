package com.broandbro.qrapp.controller;

import com.broandbro.qrapp.dto.pricing.PriceSetRequest;
import com.broandbro.qrapp.dto.pricing.SellingPriceHistoryResponse;
import com.broandbro.qrapp.dto.pricing.VendorCostHistoryResponse;
import com.broandbro.qrapp.dto.pricing.VendorCostSetRequest;
import com.broandbro.qrapp.entity.MenuItemSellingPriceHistory;
import com.broandbro.qrapp.entity.VendorMenuItemCostHistory;
import com.broandbro.qrapp.service.PricingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * REST API for enterprise pricing and procurement cost management.
 *
 * <p>All mutating endpoints require ADMIN or SUPER_USER role.
 * Read endpoints are accessible to authenticated users.
 */
@RestController
@RequestMapping("/api/pricing")
@RequiredArgsConstructor
public class PricingController {

    private final PricingService pricingService;

    // =========================================================================
    // SELLING PRICE ENDPOINTS
    // =========================================================================

    /**
     * Get the current resolved selling price for a menu item.
     */
    @GetMapping("/menu-items/{menuItemId}/current-price")
    public ResponseEntity<Map<String, Object>> getCurrentSellingPrice(
            @PathVariable Long menuItemId) {
        BigDecimal price = pricingService.getCurrentSellingPrice(menuItemId);
        return ResponseEntity.ok(Map.of("menuItemId", menuItemId, "sellingPrice", price));
    }

    /**
     * Get the full selling price history for a menu item (most recent first).
     */
    @GetMapping("/menu-items/{menuItemId}/price-history")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_USER')")
    public ResponseEntity<List<SellingPriceHistoryResponse>> getSellingPriceHistory(
            @PathVariable Long menuItemId) {
        return ResponseEntity.ok(pricingService.getSellingPriceHistory(menuItemId));
    }

    /**
     * Set (or update) the selling price for a menu item.
     * Closes the current active price record and opens a new one.
     */
    @PostMapping("/menu-items/set-price")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_USER')")
    public ResponseEntity<MenuItemSellingPriceHistory> setSellingPrice(
            @RequestBody PriceSetRequest request) {
        MenuItemSellingPriceHistory saved = pricingService.setSellingPrice(request);
        return ResponseEntity.ok(saved);
    }

    // =========================================================================
    // VENDOR COST ENDPOINTS
    // =========================================================================

    /**
     * Get all active vendor costs for a menu item (cheapest first).
     * Useful for procurement intelligence dashboards.
     */
    @GetMapping("/menu-items/{menuItemId}/vendor-costs")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_USER')")
    public ResponseEntity<List<VendorCostHistoryResponse>> getAllVendorCostsForItem(
            @PathVariable Long menuItemId) {
        return ResponseEntity.ok(pricingService.getAllVendorCostsForItem(menuItemId));
    }

    /**
     * Get the full cost history for a specific (vendor, menuItem) pair.
     */
    @GetMapping({
            "/vendors/{vendorId}/menu-items/{menuItemId}/cost-history",
            "/shops/{vendorId}/menu-items/{menuItemId}/cost-history"
    })
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_USER')")
    public ResponseEntity<List<VendorCostHistoryResponse>> getVendorCostHistory(
            @PathVariable Long vendorId,
            @PathVariable Long menuItemId) {
        return ResponseEntity.ok(pricingService.getVendorCostHistory(vendorId, menuItemId));
    }

    /**
     * Set (or update) the procurement cost for a (vendor, menuItem) pair.
     */
    @PostMapping("/vendor-costs/set")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_USER')")
    public ResponseEntity<VendorMenuItemCostHistory> setVendorCost(
            @RequestBody VendorCostSetRequest request) {
        VendorMenuItemCostHistory saved = pricingService.setVendorCost(request);
        return ResponseEntity.ok(saved);
    }

    /**
     * Profitability preview: returns current selling price, cheapest vendor cost
     * and projected per-unit margin for a menu item.
     */
    @GetMapping("/menu-items/{menuItemId}/profitability")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_USER')")
    public ResponseEntity<Map<String, Object>> getProfitabilityPreview(
            @PathVariable Long menuItemId) {
        BigDecimal sellingPrice  = pricingService.getCurrentSellingPrice(menuItemId);
        BigDecimal cheapestCost  = pricingService.getCheapestVendorCost(menuItemId).orElse(null);
        BigDecimal margin = (cheapestCost != null) ? sellingPrice.subtract(cheapestCost) : null;
        return ResponseEntity.ok(Map.of(
                "menuItemId",    menuItemId,
                "sellingPrice",  sellingPrice,
                "cheapestCost",  cheapestCost  != null ? cheapestCost  : "N/A",
                "projectedMargin", margin != null ? margin : "N/A"
        ));
    }
}
