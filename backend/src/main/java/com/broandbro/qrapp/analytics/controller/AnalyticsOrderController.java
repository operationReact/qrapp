package com.broandbro.qrapp.analytics.controller;

import com.broandbro.qrapp.analytics.dto.ApiResponse;
import com.broandbro.qrapp.analytics.dto.HourlyOrderResponse;
import com.broandbro.qrapp.analytics.dto.PeakHourResponse;
import com.broandbro.qrapp.analytics.service.OrderAnalyticsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/v1/analytics/orders")
@RequiredArgsConstructor
@Validated
@Tag(name = "Analytics — Orders", description = "Hourly order distribution and peak-hour analysis")
public class AnalyticsOrderController {

    private final OrderAnalyticsService orderService;

    // ── GET /api/v1/analytics/orders/hourly ────────────────────────────────────

    @GetMapping("/hourly")
    @Operation(summary = "Hourly order breakdown",
               description = "Returns 24 hourly buckets for the requested date. Defaults to today.")
    public ResponseEntity<ApiResponse<List<HourlyOrderResponse>>> getHourlyBreakdown(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate date) {

        LocalDate target = date != null ? date : LocalDate.now();
        log.debug("[OrderController] GET /hourly date={}", target);
        return ResponseEntity.ok(ApiResponse.ok(orderService.getHourlyBreakdown(target)));
    }

    // ── GET /api/v1/analytics/orders/heatmap ───────────────────────────────────

    @GetMapping("/heatmap")
    @Operation(summary = "Cross-date hourly heatmap",
               description = "Aggregates hourly order counts across a date range.")
    public ResponseEntity<ApiResponse<List<HourlyOrderResponse>>> getHourlyHeatmap(
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to) {

        LocalDate resolvedTo   = parseDate(to,   LocalDate.now());
        LocalDate resolvedFrom = parseDate(from, resolvedTo.minusDays(29));
        validateRange(resolvedFrom, resolvedTo);

        log.debug("[OrderController] GET /heatmap from={} to={}", resolvedFrom, resolvedTo);
        return ResponseEntity.ok(ApiResponse.ok(
                orderService.getHourlyBreakdownRange(resolvedFrom, resolvedTo)));
    }

    // ── GET /api/v1/analytics/orders/peak-hours ────────────────────────────────

    @GetMapping("/peak-hours")
    @Operation(summary = "Peak hours analysis",
               description = "Returns hours ranked by order volume. Hours above average are flagged as peak.")
    public ResponseEntity<ApiResponse<List<PeakHourResponse>>> getPeakHours(
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to) {

        LocalDate resolvedTo   = parseDate(to,   LocalDate.now());
        LocalDate resolvedFrom = parseDate(from, resolvedTo.minusDays(29));
        validateRange(resolvedFrom, resolvedTo);

        log.debug("[OrderController] GET /peak-hours from={} to={}", resolvedFrom, resolvedTo);
        return ResponseEntity.ok(ApiResponse.ok(
                orderService.getPeakHours(resolvedFrom, resolvedTo)));
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    /**
     * Accepts either:
     *   - plain date:     "2026-06-01"
     *   - ISO datetime:   "2026-06-01T19:51:56.096Z"
     * and returns the LocalDate portion (UTC).
     * Falls back to {@code defaultDate} when the value is null/blank.
     */
    private LocalDate parseDate(String value, LocalDate defaultDate) {
        if (value == null || value.isBlank()) return defaultDate;
        try {
            if (value.contains("T")) {
                return Instant.parse(value).atZone(ZoneOffset.UTC).toLocalDate();
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

