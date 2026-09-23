package com.broandbro.qrapp.analytics.controller;

import com.broandbro.qrapp.analytics.dto.ApiResponse;
import com.broandbro.qrapp.analytics.dto.TopMenuItemResponse;
import com.broandbro.qrapp.analytics.service.MenuAnalyticsService;
import com.broandbro.qrapp.analytics.support.AnalyticsLocationScope;
import com.broandbro.qrapp.analytics.support.AnalyticsScopeResolver;
import com.broandbro.qrapp.time.BusinessTime;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/**
 * Menu analytics endpoints.
 *
 * <pre>
 * GET /api/v1/analytics/menu/top-selling           — top N items by revenue
 * GET /api/v1/analytics/menu/top-selling/paged     — paged version
 * GET /api/v1/analytics/menu/top-by-qty            — top N items by quantity
 * GET /api/v1/analytics/menu/categories            — category-level revenue rollup
 * </pre>
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/analytics/menu")
@RequiredArgsConstructor
@Validated
@PreAuthorize("hasAnyRole('ADMIN', 'SUPERUSER', 'SUPER_ADMIN', 'MANAGER')")
@Tag(name = "Analytics — Menu", description = "Item and category performance analytics")
public class AnalyticsMenuController {

    private final MenuAnalyticsService menuService;
    private final AnalyticsScopeResolver scopeResolver;

    // ── GET /api/v1/analytics/menu/top-selling ─────────────────────────────────

    @GetMapping("/top-selling")
    @Operation(
        summary = "Top-selling items by revenue",
        description = "Returns the top N menu items ranked by total revenue across a date range."
    )
    public ResponseEntity<ApiResponse<List<TopMenuItemResponse>>> getTopSellingByRevenue(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @Parameter(description = "Max items to return (1–50)")
            @RequestParam(defaultValue = "10") @Min(1) @Max(50) int limit,
            @RequestParam(required = false) Long locationId,
            Authentication authentication) {

        LocalDate resolvedTo   = to   != null ? to   : BusinessTime.today();
        LocalDate resolvedFrom = from != null ? from : resolvedTo.minusDays(29);

        AnalyticsLocationScope scope = scopeResolver.resolve(authentication, locationId);
        log.debug("[MenuController] GET /top-selling from={} to={} limit={} locationId={}",
                resolvedFrom, resolvedTo, limit, locationId);
        return ResponseEntity.ok(ApiResponse.ok(
                menuService.getTopItemsByRevenue(resolvedFrom, resolvedTo, limit, scope)));
    }


    @GetMapping("/top-selling/paged")
    @Operation(summary = "Top-selling items (paged)", description = "Supports sortBy=revenue (default) or sortBy=qty.")
    public ResponseEntity<ApiResponse<Page<TopMenuItemResponse>>> getTopSellingPaged(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "revenue") String sortBy,
            @RequestParam(required = false) Long locationId,
            Authentication authentication,
            @PageableDefault(size = 20) Pageable pageable) {

        LocalDate resolvedTo   = to   != null ? to   : BusinessTime.today();
        LocalDate resolvedFrom = from != null ? from : resolvedTo.minusDays(29);
        AnalyticsLocationScope scope = scopeResolver.resolve(authentication, locationId);
        return ResponseEntity.ok(ApiResponse.ok(
                menuService.getTopItemsPaged(resolvedFrom, resolvedTo, sortBy, scope, pageable)));
    }

    // ── GET /api/v1/analytics/menu/top-by-qty ─────────────────────────────────

    @GetMapping("/top-by-qty")
    @Operation(summary = "Top items by quantity sold")
    public ResponseEntity<ApiResponse<List<TopMenuItemResponse>>> getTopByQty(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "10") @Min(1) @Max(50) int limit,
            @RequestParam(required = false) Long locationId,
            Authentication authentication) {

        LocalDate resolvedTo   = to   != null ? to   : BusinessTime.today();
        LocalDate resolvedFrom = from != null ? from : resolvedTo.minusDays(29);
        AnalyticsLocationScope scope = scopeResolver.resolve(authentication, locationId);
        return ResponseEntity.ok(ApiResponse.ok(
                menuService.getTopItemsByQty(resolvedFrom, resolvedTo, limit, scope)));
    }

    // ── GET /api/v1/analytics/menu/least-selling ──────────────────────────────

    @GetMapping("/least-selling")
    @Operation(
        summary = "Least-selling items by revenue",
        description = "Returns the bottom N menu items ranked by total revenue across a date range."
    )
    public ResponseEntity<ApiResponse<List<TopMenuItemResponse>>> getLeastSelling(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @Parameter(description = "Max items to return (1–50)")
            @RequestParam(defaultValue = "10") @Min(1) @Max(50) int limit,
            @RequestParam(required = false) Long locationId,
            Authentication authentication) {

        LocalDate resolvedTo   = to   != null ? to   : BusinessTime.today();
        LocalDate resolvedFrom = from != null ? from : resolvedTo.minusDays(29);
        AnalyticsLocationScope scope = scopeResolver.resolve(authentication, locationId);
        log.debug("[MenuController] GET /least-selling from={} to={} limit={} locationId={}",
                resolvedFrom, resolvedTo, limit, locationId);
        return ResponseEntity.ok(ApiResponse.ok(
                menuService.getLeastSellingItems(resolvedFrom, resolvedTo, limit, scope)));
    }

    // ── GET /api/v1/analytics/menu/categories ─────────────────────────────────

    @GetMapping("/categories")
    @Operation(summary = "Category revenue rollup", description = "Revenue breakdown by category across a date range.")
    public ResponseEntity<ApiResponse<List<TopMenuItemResponse>>> getCategoryRollup(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) Long locationId,
            Authentication authentication) {

        LocalDate resolvedTo   = to   != null ? to   : BusinessTime.today();
        LocalDate resolvedFrom = from != null ? from : resolvedTo.minusDays(29);
        AnalyticsLocationScope scope = scopeResolver.resolve(authentication, locationId);
        return ResponseEntity.ok(ApiResponse.ok(
                menuService.getCategoryRevenueRollup(resolvedFrom, resolvedTo, scope)));
    }

    // ── GET /api/v1/analytics/menu/revenue ────────────────────────────────────

    @GetMapping("/revenue")
    @Operation(
        summary = "Menu items revenue breakdown",
        description = "Returns all menu items ranked by revenue across a date range. Used for revenue contribution charts."
    )
    public ResponseEntity<ApiResponse<List<TopMenuItemResponse>>> getMenuRevenue(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "50") @Min(1) @Max(100) int limit,
            @RequestParam(required = false) Long locationId,
            Authentication authentication) {

        LocalDate resolvedTo   = to   != null ? to   : BusinessTime.today();
        LocalDate resolvedFrom = from != null ? from : resolvedTo.minusDays(29);
        AnalyticsLocationScope scope = scopeResolver.resolve(authentication, locationId);
        log.debug("[MenuController] GET /revenue from={} to={} limit={} locationId={}",
                resolvedFrom, resolvedTo, limit, locationId);
        return ResponseEntity.ok(ApiResponse.ok(
                menuService.getTopItemsByRevenue(resolvedFrom, resolvedTo, limit, scope)));
    }
}
