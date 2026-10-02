package com.broandbro.qrapp.analytics.controller;

import com.broandbro.qrapp.analytics.dto.ApiResponse;
import com.broandbro.qrapp.analytics.dto.DailySalesResponse;
import com.broandbro.qrapp.analytics.dto.DashboardSummaryResponse;
import com.broandbro.qrapp.analytics.scheduler.DailySalesAggregationScheduler;
import com.broandbro.qrapp.analytics.service.SalesAnalyticsService;
import com.broandbro.qrapp.analytics.support.AnalyticsLocationScope;
import com.broandbro.qrapp.analytics.support.AnalyticsScopeResolver;
import com.broandbro.qrapp.time.BusinessTime;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
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
import java.util.Optional;

/**
 * Sales analytics endpoints.
 *
 * <pre>
 * GET /api/v1/analytics/sales/daily    — daily time-series
 * GET /api/v1/analytics/sales/weekly   — last-7-days summary
 * GET /api/v1/analytics/sales/monthly  — last-30-days summary
 * GET /api/v1/analytics/sales/summary  — custom range KPI strip
 * </pre>
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/analytics/sales")
@RequiredArgsConstructor
@Validated
@PreAuthorize("hasAnyRole('ADMIN', 'SUPERUSER', 'SUPER_ADMIN', 'MANAGER')")
@Tag(name = "Analytics — Sales", description = "Daily & weekly sales KPI endpoints")
public class AnalyticsSalesController {

    private final SalesAnalyticsService salesService;
    private final DailySalesAggregationScheduler dailySalesScheduler;
    private final AnalyticsScopeResolver scopeResolver;

    // ── GET /api/v1/analytics/sales/daily ──────────────────────────────────────

    @GetMapping("/daily")
    @Operation(
        summary = "Daily sales time-series",
        description = "Returns a row per calendar day in the requested range. Defaults to the last 30 days."
    )
    public ResponseEntity<ApiResponse<List<DailySalesResponse>>> getDailySeries(
            @Parameter(description = "Start date (yyyy-MM-dd), inclusive")
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate from,

            @Parameter(description = "End date (yyyy-MM-dd), inclusive")
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate to,

            @Parameter(description = "Restrict to a location. Omit for all accessible locations.")
            @RequestParam(required = false) Long locationId,
            Authentication authentication) {

        LocalDate resolvedTo   = to   != null ? to   : BusinessTime.today();
        LocalDate resolvedFrom = from != null ? from : resolvedTo.minusDays(1);
        validateRange(resolvedFrom, resolvedTo);
        AnalyticsLocationScope scope = scopeResolver.resolve(authentication, locationId);
        refreshTodaySnapshotIfIncluded(resolvedFrom, resolvedTo);

        log.debug("[SalesController] GET /daily from={} to={} locationId={}", resolvedFrom, resolvedTo, locationId);
        return ResponseEntity.ok(
                ApiResponse.ok(salesService.getDailySeries(resolvedFrom, resolvedTo, scope)));
    }

    @GetMapping("/daily/paged")
    @Operation(summary = "Daily sales time-series (paged)")
    public ResponseEntity<ApiResponse<Page<DailySalesResponse>>> getDailySeriesPaged(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) Long locationId,
            Authentication authentication,
            @PageableDefault(size = 30, sort = "salesDate") Pageable pageable) {

        LocalDate resolvedTo   = to   != null ? to   : BusinessTime.today();
        LocalDate resolvedFrom = from != null ? from : resolvedTo.minusDays(29);
        validateRange(resolvedFrom, resolvedTo);
        AnalyticsLocationScope scope = scopeResolver.resolve(authentication, locationId);

        return ResponseEntity.ok(ApiResponse.ok(
                salesService.getDailySeriesPaged(resolvedFrom, resolvedTo, scope, pageable)));
    }

    // ── GET /api/v1/analytics/sales/daily/previous ─────────────────────────────

    @GetMapping("/daily/previous")
    @Operation(
        summary = "Previous day's sales snapshot",
        description = "Returns the daily sales record for the day before the given date. " +
                      "Defaults to yesterday (day before today) if no date is provided. " +
                      "Returns 404 if no snapshot exists for that day."
    )
    public ResponseEntity<ApiResponse<DailySalesResponse>> getPreviousDay(
            @Parameter(description = "Reference date (yyyy-MM-dd) — returns the day before this. Defaults to today.")
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) Long locationId,
            Authentication authentication) {

        LocalDate referenceDate = date != null ? date : BusinessTime.today();
        AnalyticsLocationScope scope = scopeResolver.resolve(authentication, locationId);
        log.debug("[SalesController] GET /daily/previous referenceDate={} locationId={}", referenceDate, locationId);

        Optional<DailySalesResponse> result = salesService.findByPreviousDate(referenceDate, scope);
        return result
                .map(r -> ResponseEntity.ok(ApiResponse.ok(r)))
                .orElseGet(() -> ResponseEntity.status(404)
                        .body(ApiResponse.error("No sales snapshot found for " + referenceDate.minusDays(1))));
    }

    // ── GET /api/v1/analytics/sales/weekly ─────────────────────────────────────

    @GetMapping("/weekly")
    @Operation(
        summary = "Last-7-days sales summary",
        description = "Aggregate KPI strip for the previous 7 calendar days."
    )
    public ResponseEntity<ApiResponse<DashboardSummaryResponse>> getWeeklySummary(
            @RequestParam(required = false) Long locationId,
            Authentication authentication) {
        log.debug("[SalesController] GET /weekly locationId={}", locationId);
        AnalyticsLocationScope scope = scopeResolver.resolve(authentication, locationId);
        return ResponseEntity.ok(ApiResponse.ok(salesService.getWeeklySummary(scope)));
    }

    // ── GET /api/v1/analytics/sales/monthly ────────────────────────────────────

    @GetMapping("/monthly")
    @Operation(summary = "Last-30-days sales summary")
    public ResponseEntity<ApiResponse<DashboardSummaryResponse>> getMonthlySummary(
            @RequestParam(required = false) Long locationId,
            Authentication authentication) {
        AnalyticsLocationScope scope = scopeResolver.resolve(authentication, locationId);
        return ResponseEntity.ok(ApiResponse.ok(salesService.getMonthlySummary(scope)));
    }

    // ── GET /api/v1/analytics/sales/summary ────────────────────────────────────

    @GetMapping("/summary")
    @Operation(summary = "Custom date-range KPI summary")
    public ResponseEntity<ApiResponse<DashboardSummaryResponse>> getSummary(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) Long locationId,
            Authentication authentication) {
        validateRange(from, to);
        AnalyticsLocationScope scope = scopeResolver.resolve(authentication, locationId);
        refreshTodaySnapshotIfIncluded(from, to);
        return ResponseEntity.ok(ApiResponse.ok(salesService.getDashboardSummary(from, to, scope)));
    }

    // ── POST /api/v1/analytics/sales/backfill ──────────────────────────────────

    @PostMapping("/backfill")
    @Operation(
        summary = "Backfill daily sales snapshots",
        description = "Upserts daily sales snapshots for every day in the given range. " +
                      "Safe to re-run — existing rows are updated (upsert). " +
                      "Max range: 365 days."
    )
    public ResponseEntity<ApiResponse<String>> backfill(
            @Parameter(description = "Start date (yyyy-MM-dd), inclusive")
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @Parameter(description = "End date (yyyy-MM-dd), inclusive")
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {

        validateRange(from, to);
        log.info("[SalesController] Backfill requested from={} to={}", from, to);
        dailySalesScheduler.backfill(from, to);
        long days = from.datesUntil(to.plusDays(1)).count();
        return ResponseEntity.ok(ApiResponse.ok(
                "Backfill complete for " + days + " day(s) from " + from + " to " + to));
    }

    // ── Validation ─────────────────────────────────────────────────────────────

    private void validateRange(LocalDate from, LocalDate to) {
        if (from.isAfter(to)) {
            throw new IllegalArgumentException("'from' must not be after 'to'");
        }
        if (from.plusDays(365).isBefore(to)) {
            throw new IllegalArgumentException("Date range must not exceed 365 days");
        }
        LocalDate today = BusinessTime.today();
        if (from.isAfter(today) || to.isAfter(today)) {
            throw new IllegalArgumentException("Analytics dates cannot be in the future");
        }
    }

    private void refreshTodaySnapshotIfIncluded(LocalDate from, LocalDate to) {
        LocalDate today = BusinessTime.today();
        if (!to.isBefore(today) && !from.isAfter(today)) {
            dailySalesScheduler.executeUpsert(today);
        }
    }
}
