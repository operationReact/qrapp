package com.broandbro.qrapp.analytics.controller;

import com.broandbro.qrapp.analytics.dto.ApiResponse;
import com.broandbro.qrapp.analytics.dto.OverviewKpiResponse;
import com.broandbro.qrapp.analytics.dto.TopMenuItemResponse;
import com.broandbro.qrapp.analytics.projection.HourlyOrderSummaryProjection;
import com.broandbro.qrapp.analytics.repository.DailySalesAnalyticsRepository;
import com.broandbro.qrapp.analytics.repository.HourlyOrderAnalyticsRepository;
import com.broandbro.qrapp.analytics.scheduler.DailySalesAggregationScheduler;
import com.broandbro.qrapp.analytics.service.MenuAnalyticsService;
import com.broandbro.qrapp.analytics.support.AnalyticsLocationScope;
import com.broandbro.qrapp.analytics.support.AnalyticsScopeResolver;
import com.broandbro.qrapp.promotion.repository.PromotionRepository;
import com.broandbro.qrapp.time.BusinessTime;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;

/**
 * Aggregated overview KPI endpoint for the admin dashboard.
 *
 * <pre>
 * GET /api/v1/analytics/overview  — today's revenue, orders, trend, peak hour, top item, active promos
 * </pre>
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/analytics")
@RequiredArgsConstructor
@Tag(name = "Analytics — Overview", description = "Aggregated KPI snapshot for the admin dashboard home screen")
public class AnalyticsDashboardController {

    private final DailySalesAnalyticsRepository    dailySalesRepo;
    private final DailySalesAggregationScheduler   dailySalesScheduler;
    private final HourlyOrderAnalyticsRepository   hourlyRepo;
    private final MenuAnalyticsService             menuService;
    private final PromotionRepository              promotionRepo;
    private final AnalyticsScopeResolver           scopeResolver;

    // ── GET /api/v1/analytics/overview ────────────────────────────────────────

    @GetMapping("/overview")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERUSER', 'SUPER_ADMIN', 'MANAGER')")
    @Operation(
        summary  = "Dashboard overview KPIs",
        description = "Returns today's revenue, order count, avg order value with day-over-day trends, "
                    + "peak trading hour, top-selling item and active promotion count. "
                    + "Refreshes today's materialized snapshot before returning so data is always current."
    )
    public ResponseEntity<ApiResponse<OverviewKpiResponse>> getOverview(
            @RequestParam(required = false) Long locationId,
            Authentication authentication) {

        LocalDate today     = BusinessTime.today();
        LocalDate yesterday = today.minusDays(1);
        AnalyticsLocationScope scope = scopeResolver.resolve(authentication, locationId);
        if (!scope.visible()) {
            return ResponseEntity.ok(ApiResponse.ok(new OverviewKpiResponse(
                    BigDecimal.ZERO, null,
                    0L, null,
                    BigDecimal.ZERO, null,
                    null, null,
                    0L
            )));
        }

        // ── Refresh today's intraday snapshot so revenue is live ──────────────
        // This is the same pattern used by AnalyticsOrderController for hourly data.
        // The upsert is idempotent and safe to call on every request.
        dailySalesScheduler.executeUpsert(today);

        // ── Today's aggregate ─────────────────────────────────────────────────
        DailySalesAnalyticsRepository.DashboardKpiProjection todayKpi =
                dailySalesRepo.aggregateKpiForRange(today, today, scope.allLocations(), scope.locationIds());

        BigDecimal revToday  = safe(todayKpi.getTotalRevenue());
        long       ordToday  = safeLong(todayKpi.getCompletedOrders());
        BigDecimal aovToday  = safe(todayKpi.getAverageOrderValue());

        // ── Yesterday's aggregate (for trend %) ───────────────────────────────
        DailySalesAnalyticsRepository.DashboardKpiProjection yestKpi =
                dailySalesRepo.aggregateKpiForRange(yesterday, yesterday, scope.allLocations(), scope.locationIds());

        BigDecimal revYest  = safe(yestKpi.getTotalRevenue());
        long       ordYest  = safeLong(yestKpi.getCompletedOrders());
        BigDecimal aovYest  = safe(yestKpi.getAverageOrderValue());

        // ── Trends ────────────────────────────────────────────────────────────
        Double revTrend = pctChange(revYest, revToday);
        Double ordTrend = pctChange(BigDecimal.valueOf(ordYest), BigDecimal.valueOf(ordToday));
        Double aovTrend = pctChange(aovYest, aovToday);

        // ── Peak hour — hour with highest order count today ───────────────────
        String peakHour = hourlyRepo.findHourlyBreakdownForDate(today, scope.allLocations(), scope.locationIds())
                .stream()
                .max(Comparator.comparingLong(HourlyOrderSummaryProjection::getTotalOrderCount))
                .map(h -> hourLabel(h.getHourOfDay()))
                .orElse(null);

        // ── Top-selling item (last 7 days gives reliable data on low-volume days) ──
        List<TopMenuItemResponse> topList =
                menuService.getTopItemsByRevenue(today.minusDays(6), today, 1, scope);
        String topItem = topList.isEmpty() ? null : topList.get(0).menuItemName();

        // ── Active promotions count ───────────────────────────────────────────
        long activePromos = promotionRepo.findActiveCandidates(BusinessTime.now()).size();

        log.debug("[OverviewKPI] today={} rev={} orders={} trend={}%",
                today, revToday, ordToday, revTrend);

        return ResponseEntity.ok(ApiResponse.ok(new OverviewKpiResponse(
                revToday, revTrend,
                ordToday, ordTrend,
                aovToday, aovTrend,
                peakHour, topItem,
                activePromos
        )));
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    /** Null-safe BigDecimal (returns ZERO for null). */
    private static BigDecimal safe(BigDecimal v) {
        return v != null ? v : BigDecimal.ZERO;
    }

    /** Null-safe Long → long. */
    private static long safeLong(Long v) {
        return v != null ? v : 0L;
    }

    /**
     * Percentage change: (to - from) / from × 100.
     * Returns {@code null} when {@code from} is zero (no comparison baseline).
     */
    private static Double pctChange(BigDecimal from, BigDecimal to) {
        if (from == null || from.compareTo(BigDecimal.ZERO) == 0) return null;
        return to.subtract(from)
                 .divide(from, 4, RoundingMode.HALF_UP)
                 .multiply(BigDecimal.valueOf(100))
                 .doubleValue();
    }

    /**
     * Converts a 24-hour integer to a compact AM/PM label.
     * e.g. 0 → "12A", 9 → "9A", 12 → "12P", 18 → "6P"
     */
    private static String hourLabel(int h) {
        if (h == 0)  return "12A";
        if (h < 12)  return h + "A";
        if (h == 12) return "12P";
        return (h - 12) + "P";
    }
}
