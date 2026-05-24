package com.broandbro.qrapp.analytics.controller;

import com.broandbro.qrapp.analytics.dto.ApiResponse;
import com.broandbro.qrapp.analytics.dto.CouponPerformanceResponse;
import com.broandbro.qrapp.analytics.service.CouponAnalyticsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Min;
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
 * Coupon analytics endpoints.
 *
 * <pre>
 * GET /api/v1/analytics/coupons/performance        — summary list
 * GET /api/v1/analytics/coupons/performance/paged  — paged + searchable
 * GET /api/v1/analytics/coupons/abuse              — abuse signals
 * </pre>
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/analytics/coupons")
@RequiredArgsConstructor
@Validated
@Tag(name = "Analytics — Coupons", description = "Coupon ROI, conversion and abuse-detection analytics")
public class AnalyticsCouponController {

    private final CouponAnalyticsService couponService;

    // ── GET /api/v1/analytics/coupons/performance ─────────────────────────────

    @GetMapping("/performance")
    @Operation(
        summary = "Coupon performance summary",
        description = "Aggregated performance per coupon across a date range, sorted by revenue generated."
    )
    public ResponseEntity<ApiResponse<List<CouponPerformanceResponse>>> getPerformanceSummary(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {

        LocalDate resolvedTo   = to   != null ? to   : LocalDate.now();
        LocalDate resolvedFrom = from != null ? from : resolvedTo.minusDays(29);
        validateRange(resolvedFrom, resolvedTo);

        log.debug("[CouponController] GET /performance from={} to={}", resolvedFrom, resolvedTo);
        return ResponseEntity.ok(ApiResponse.ok(
                couponService.getPerformanceSummary(resolvedFrom, resolvedTo)));
    }

    @GetMapping("/performance/paged")
    @Operation(summary = "Coupon performance (paged, searchable)")
    public ResponseEntity<ApiResponse<Page<CouponPerformanceResponse>>> getPerformancePaged(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @Parameter(description = "Filter by coupon code (partial match)")
            @RequestParam(required = false) String couponCode,
            @PageableDefault(size = 20) Pageable pageable) {

        LocalDate resolvedTo   = to   != null ? to   : LocalDate.now();
        LocalDate resolvedFrom = from != null ? from : resolvedTo.minusDays(29);
        validateRange(resolvedFrom, resolvedTo);

        return ResponseEntity.ok(ApiResponse.ok(
                couponService.getPerformancePaged(resolvedFrom, resolvedTo, couponCode, pageable)));
    }

    // ── GET /api/v1/analytics/coupons/abuse ────────────────────────────────────

    @GetMapping("/abuse")
    @Operation(
        summary = "Coupon abuse signals",
        description = "Returns coupons where the same user redeemed more than `threshold` times on a given day."
    )
    public ResponseEntity<ApiResponse<List<CouponPerformanceResponse>>> getAbuseSignals(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @Parameter(description = "Minimum repeat redemption count to flag as abuse (default: 1)")
            @RequestParam(defaultValue = "1") @Min(1) int threshold) {

        LocalDate resolvedTo   = to   != null ? to   : LocalDate.now();
        LocalDate resolvedFrom = from != null ? from : resolvedTo.minusDays(29);
        validateRange(resolvedFrom, resolvedTo);

        log.debug("[CouponController] GET /abuse from={} to={} threshold={}", resolvedFrom, resolvedTo, threshold);
        return ResponseEntity.ok(ApiResponse.ok(
                couponService.getAbuseSignals(resolvedFrom, resolvedTo, threshold)));
    }

    // ── Validation ─────────────────────────────────────────────────────────────

    private void validateRange(LocalDate from, LocalDate to) {
        if (from.isAfter(to))
            throw new IllegalArgumentException("'from' must not be after 'to'");
        if (from.plusDays(365).isBefore(to))
            throw new IllegalArgumentException("Date range must not exceed 365 days");
    }
}

