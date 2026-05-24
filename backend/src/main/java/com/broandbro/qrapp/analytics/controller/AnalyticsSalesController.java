package com.broandbro.qrapp.analytics.controller;

import com.broandbro.qrapp.analytics.dto.ApiResponse;
import com.broandbro.qrapp.analytics.dto.DailySalesResponse;
import com.broandbro.qrapp.analytics.dto.DashboardSummaryResponse;
import com.broandbro.qrapp.analytics.service.SalesAnalyticsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.PastOrPresent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

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
@Tag(name = "Analytics — Sales", description = "Daily & weekly sales KPI endpoints")
public class AnalyticsSalesController {

    private final SalesAnalyticsService salesService;

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
            @PastOrPresent LocalDate from,

            @Parameter(description = "End date (yyyy-MM-dd), inclusive")
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate to) {

        LocalDate resolvedTo   = to   != null ? to   : LocalDate.now();
        LocalDate resolvedFrom = from != null ? from : resolvedTo.minusDays(29);
        validateRange(resolvedFrom, resolvedTo);

        log.debug("[SalesController] GET /daily from={} to={}", resolvedFrom, resolvedTo);
        return ResponseEntity.ok(
                ApiResponse.ok(salesService.getDailySeries(resolvedFrom, resolvedTo)));
    }

    @GetMapping("/daily/paged")
    @Operation(summary = "Daily sales time-series (paged)")
    public ResponseEntity<ApiResponse<Page<DailySalesResponse>>> getDailySeriesPaged(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @PageableDefault(size = 30, sort = "salesDate") Pageable pageable) {

        LocalDate resolvedTo   = to   != null ? to   : LocalDate.now();
        LocalDate resolvedFrom = from != null ? from : resolvedTo.minusDays(29);
        validateRange(resolvedFrom, resolvedTo);

        return ResponseEntity.ok(ApiResponse.ok(
                salesService.getDailySeriesPaged(resolvedFrom, resolvedTo, pageable)));
    }

    // ── GET /api/v1/analytics/sales/weekly ─────────────────────────────────────

    @GetMapping("/weekly")
    @Operation(
        summary = "Last-7-days sales summary",
        description = "Aggregate KPI strip for the previous 7 calendar days."
    )
    public ResponseEntity<ApiResponse<DashboardSummaryResponse>> getWeeklySummary() {
        log.debug("[SalesController] GET /weekly");
        return ResponseEntity.ok(ApiResponse.ok(salesService.getWeeklySummary()));
    }

    // ── GET /api/v1/analytics/sales/monthly ────────────────────────────────────

    @GetMapping("/monthly")
    @Operation(summary = "Last-30-days sales summary")
    public ResponseEntity<ApiResponse<DashboardSummaryResponse>> getMonthlySummary() {
        return ResponseEntity.ok(ApiResponse.ok(salesService.getMonthlySummary()));
    }

    // ── GET /api/v1/analytics/sales/summary ────────────────────────────────────

    @GetMapping("/summary")
    @Operation(summary = "Custom date-range KPI summary")
    public ResponseEntity<ApiResponse<DashboardSummaryResponse>> getSummary(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        validateRange(from, to);
        return ResponseEntity.ok(ApiResponse.ok(salesService.getDashboardSummary(from, to)));
    }

    // ── Validation ─────────────────────────────────────────────────────────────

    private void validateRange(LocalDate from, LocalDate to) {
        if (from.isAfter(to)) {
            throw new IllegalArgumentException("'from' must not be after 'to'");
        }
        if (from.plusDays(365).isBefore(to)) {
            throw new IllegalArgumentException("Date range must not exceed 365 days");
        }
    }
}

