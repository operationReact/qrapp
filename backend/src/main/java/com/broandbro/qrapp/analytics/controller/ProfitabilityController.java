package com.broandbro.qrapp.analytics.controller;

import com.broandbro.qrapp.analytics.dto.ApiResponse;
import com.broandbro.qrapp.analytics.dto.ProfitabilityDashboardResponse;
import com.broandbro.qrapp.analytics.dto.TopMenuItemResponse;
import com.broandbro.qrapp.analytics.service.ProfitabilityService;
import com.broandbro.qrapp.analytics.support.AnalyticsLocationScope;
import com.broandbro.qrapp.analytics.support.AnalyticsScopeResolver;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/**
 * Profitability analytics endpoints.
 *
 * <pre>
 * GET /api/v1/analytics/profitability/dashboard  — full profitability KPI dashboard
 * GET /api/v1/analytics/profitability/items      — most profitable items
 * GET /api/v1/analytics/profitability/margin     — highest margin items
 * </pre>
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/analytics/profitability")
@RequiredArgsConstructor
@Validated
@PreAuthorize("hasAnyRole('ADMIN', 'SUPERUSER', 'SUPER_ADMIN', 'MANAGER')")
@Tag(name = "Analytics — Profitability",
     description = "Profit, margin, and cost analytics to drive smarter pricing and menu decisions")
public class ProfitabilityController {

    private final ProfitabilityService profitabilityService;
    private final AnalyticsScopeResolver scopeResolver;

    // ── GET /api/v1/analytics/profitability/dashboard ─────────────────────────

    @GetMapping("/dashboard")
    @Operation(
        summary = "Profitability dashboard",
        description = "Returns aggregated revenue, cost, profit, margin KPIs plus most-profitable "
                    + "items, highest-margin items, and actionable business insights for the date range."
    )
    public ResponseEntity<ApiResponse<ProfitabilityDashboardResponse>> getDashboard(
            @Parameter(description = "Start date (ISO-8601). Defaults to 30 days ago.")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @Parameter(description = "End date (ISO-8601). Defaults to today.")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) Long locationId,
            Authentication authentication) {

        LocalDate resolvedTo   = to   != null ? to   : LocalDate.now();
        LocalDate resolvedFrom = from != null ? from : resolvedTo.minusDays(29);
        AnalyticsLocationScope scope = scopeResolver.resolve(authentication, locationId);

        log.debug("[ProfitabilityController] GET /dashboard from={} to={} locationId={}",
                resolvedFrom, resolvedTo, locationId);
        return ResponseEntity.ok(ApiResponse.ok(
                profitabilityService.getProfitabilityDashboard(resolvedFrom, resolvedTo, scope)));
    }

    // ── GET /api/v1/analytics/profitability/items ─────────────────────────────

    @GetMapping("/items")
    @Operation(
        summary = "Most profitable items",
        description = "Returns the top N menu items ranked by total estimated profit (revenue – cost)."
    )
    public ResponseEntity<ApiResponse<List<TopMenuItemResponse>>> getMostProfitableItems(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @Parameter(description = "Number of items to return (1–50)")
            @RequestParam(defaultValue = "10") @Min(1) @Max(50) int limit,
            @RequestParam(required = false) Long locationId,
            Authentication authentication) {

        LocalDate resolvedTo   = to   != null ? to   : LocalDate.now();
        LocalDate resolvedFrom = from != null ? from : resolvedTo.minusDays(29);
        AnalyticsLocationScope scope = scopeResolver.resolve(authentication, locationId);

        log.debug("[ProfitabilityController] GET /items from={} to={} limit={} locationId={}",
                resolvedFrom, resolvedTo, limit, locationId);
        return ResponseEntity.ok(ApiResponse.ok(
                profitabilityService.getMostProfitableItems(resolvedFrom, resolvedTo, limit, scope)));
    }

    // ── GET /api/v1/analytics/profitability/margin ────────────────────────────

    @GetMapping("/margin")
    @Operation(
        summary = "Highest margin items",
        description = "Returns the top N menu items ranked by profit margin %. "
                    + "Only items with at least one sale are included."
    )
    public ResponseEntity<ApiResponse<List<TopMenuItemResponse>>> getHighestMarginItems(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @Parameter(description = "Number of items to return (1–50)")
            @RequestParam(defaultValue = "10") @Min(1) @Max(50) int limit,
            @RequestParam(required = false) Long locationId,
            Authentication authentication) {

        LocalDate resolvedTo   = to   != null ? to   : LocalDate.now();
        LocalDate resolvedFrom = from != null ? from : resolvedTo.minusDays(29);
        AnalyticsLocationScope scope = scopeResolver.resolve(authentication, locationId);

        log.debug("[ProfitabilityController] GET /margin from={} to={} limit={} locationId={}",
                resolvedFrom, resolvedTo, limit, locationId);
        return ResponseEntity.ok(ApiResponse.ok(
                profitabilityService.getHighestMarginItems(resolvedFrom, resolvedTo, limit, scope)));
    }
}
