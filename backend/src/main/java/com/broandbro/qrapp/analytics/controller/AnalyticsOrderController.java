package com.broandbro.qrapp.analytics.controller;

import com.broandbro.qrapp.analytics.dto.ApiResponse;
import com.broandbro.qrapp.analytics.dto.HourlyOrderResponse;
import com.broandbro.qrapp.analytics.dto.PeakHourResponse;
import com.broandbro.qrapp.analytics.service.OrderAnalyticsService;
import com.broandbro.qrapp.analytics.support.AnalyticsLocationScope;
import com.broandbro.qrapp.analytics.support.AnalyticsScopeResolver;
import com.broandbro.qrapp.time.BusinessTime;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/v1/analytics/orders")
@RequiredArgsConstructor
@Validated
@PreAuthorize("hasAnyRole('ADMIN', 'SUPERUSER', 'SUPER_ADMIN', 'MANAGER')")
@Tag(name = "Analytics — Orders", description = "Hourly order distribution and peak-hour analysis")
public class AnalyticsOrderController {

    private final OrderAnalyticsService orderService;
    private final AnalyticsScopeResolver scopeResolver;

    // ── GET /api/v1/analytics/orders/hourly ────────────────────────────────────

    @GetMapping("/hourly")
    @Operation(summary = "Hourly order breakdown",
               description = "Returns 24 hourly buckets for the requested date. Defaults to today.")
    public ResponseEntity<ApiResponse<List<HourlyOrderResponse>>> getHourlyBreakdown(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate date,
            @RequestParam(required = false) Long locationId,
            Authentication authentication) {

        LocalDate target = date != null ? date : BusinessTime.today();
        AnalyticsLocationScope scope = scopeResolver.resolve(authentication, locationId);
        log.debug("[OrderController] GET /hourly date={} locationId={}", target, locationId);
        return ResponseEntity.ok(ApiResponse.ok(orderService.getHourlyBreakdown(target, scope)));
    }

    // ── GET /api/v1/analytics/orders/heatmap ───────────────────────────────────

    @GetMapping("/heatmap")
    @Operation(summary = "Cross-date hourly heatmap",
               description = "Aggregates hourly order counts across a date range.")
    public ResponseEntity<ApiResponse<List<HourlyOrderResponse>>> getHourlyHeatmap(
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @RequestParam(required = false) Long locationId,
            Authentication authentication) {

        LocalDate resolvedTo   = parseDate(to,   BusinessTime.today());
        LocalDate resolvedFrom = parseDate(from, resolvedTo.minusDays(29));
        validateRange(resolvedFrom, resolvedTo);

        AnalyticsLocationScope scope = scopeResolver.resolve(authentication, locationId);
        log.debug("[OrderController] GET /heatmap from={} to={} locationId={}", resolvedFrom, resolvedTo, locationId);
        return ResponseEntity.ok(ApiResponse.ok(
                orderService.getHourlyBreakdownRange(resolvedFrom, resolvedTo, scope)));
    }

    // ── GET /api/v1/analytics/orders/peak-hours ────────────────────────────────

    @GetMapping("/peak-hours")
    @Operation(summary = "Peak hours analysis",
               description = "Returns hours ranked by order volume. Hours above average are flagged as peak.")
    public ResponseEntity<ApiResponse<List<PeakHourResponse>>> getPeakHours(
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @RequestParam(required = false) Long locationId,
            Authentication authentication) {

        LocalDate resolvedTo   = parseDate(to,   BusinessTime.today());
        LocalDate resolvedFrom = parseDate(from, resolvedTo.minusDays(29));
        validateRange(resolvedFrom, resolvedTo);

        AnalyticsLocationScope scope = scopeResolver.resolve(authentication, locationId);
        log.debug("[OrderController] GET /peak-hours from={} to={} locationId={}", resolvedFrom, resolvedTo, locationId);
        return ResponseEntity.ok(ApiResponse.ok(
                orderService.getPeakHours(resolvedFrom, resolvedTo, scope)));
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    /**
     * Accepts either:
     *   - plain date:     "2026-06-01"
     *   - ISO datetime:   "2026-06-01T19:51:56.096Z"
     * and returns the date in the business timezone.
     * Falls back to {@code defaultDate} when the value is null/blank.
     */
    private LocalDate parseDate(String value, LocalDate defaultDate) {
        if (value == null || value.isBlank()) return defaultDate;
        try {
            if (value.contains("T")) {
                return BusinessTime.dateOf(Instant.parse(value));
            }
            return LocalDate.parse(value);
        } catch (Exception e) {
            log.warn("[OrderController] Could not parse date '{}', using default {}", value, defaultDate);
            return defaultDate;
        }
    }

    private void validateRange(LocalDate from, LocalDate to) {
        if (from.isAfter(to))
            throw new IllegalArgumentException("'from' must not be after 'to'");
        if (from.plusDays(365).isBefore(to))
            throw new IllegalArgumentException("Date range must not exceed 365 days");
    }
}
