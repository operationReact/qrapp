package com.broandbro.qrapp.analytics.service;

import com.broandbro.qrapp.analytics.config.AnalyticsCacheConfig;
import com.broandbro.qrapp.analytics.dto.DailySalesResponse;
import com.broandbro.qrapp.analytics.dto.DashboardSummaryResponse;
import com.broandbro.qrapp.analytics.entity.DailySalesAnalytics;
import com.broandbro.qrapp.analytics.projection.DailySalesSummaryProjection;
import com.broandbro.qrapp.analytics.repository.DailySalesAnalyticsRepository;
import com.broandbro.qrapp.analytics.support.AnalyticsLocationScope;
import com.broandbro.qrapp.time.BusinessTime;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SalesAnalyticsServiceImpl implements SalesAnalyticsService {

    private final DailySalesAnalyticsRepository dailySalesRepo;

    // ── Dashboard KPI strip ────────────────────────────────────────────────────

    @Override
    @Cacheable(
        cacheManager = "analyticsCacheManager",
        cacheNames   = AnalyticsCacheConfig.CACHE_DASHBOARD,
        key           = "'kpi:' + #from + ':' + #to + ':' + #scope.allLocations() + ':' + #scope.locationIds()"
    )
    public DashboardSummaryResponse getDashboardSummary(LocalDate from, LocalDate to, AnalyticsLocationScope scope) {
        log.debug("[SalesService] getDashboardSummary from={} to={} scope={}", from, to, scope);

        if (!scope.visible()) {
            return buildDashboardResponse(from, to, null, List.of());
        }

        DailySalesAnalyticsRepository.DashboardKpiProjection kpi =
                dailySalesRepo.aggregateKpiForRange(from, to, scope.allLocations(), scope.locationIds());

        List<DailySalesResponse> series = getDailySeries(from, to, scope);

        return buildDashboardResponse(from, to, kpi, series);
    }

    // ── Time-series ────────────────────────────────────────────────────────────

    @Override
    @Cacheable(
        cacheManager = "analyticsCacheManager",
        cacheNames   = AnalyticsCacheConfig.CACHE_DAILY_SALES,
        key           = "'series:' + #from + ':' + #to + ':' + #scope.allLocations() + ':' + #scope.locationIds()"
    )
    public List<DailySalesResponse> getDailySeries(LocalDate from, LocalDate to, AnalyticsLocationScope scope) {
        log.debug("[SalesService] getDailySeries from={} to={} scope={}", from, to, scope);
        if (!scope.visible()) {
            return List.of();
        }
        return dailySalesRepo.findSummaryByDateRange(from, to, scope.allLocations(), scope.locationIds())
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    public Optional<DailySalesResponse> findByPreviousDate(LocalDate date, AnalyticsLocationScope scope) {
        LocalDate previousDate = date.minusDays(1);
        log.debug("[SalesService] findByPreviousDate date={} (looking up {}) scope={}", date, previousDate, scope);
        if (!scope.visible()) {
            return Optional.empty();
        }
        // With per-location snapshots, aggregate the scope's rows for that day.
        if (dailySalesRepo.countByDateInScope(previousDate, scope.allLocations(), scope.locationIds()) == 0) {
            return Optional.empty();
        }
        DailySalesAnalyticsRepository.DashboardKpiProjection kpi =
                dailySalesRepo.aggregateKpiForRange(previousDate, previousDate, scope.allLocations(), scope.locationIds());
        return Optional.of(kpiToDailyResponse(previousDate, kpi));
    }

    @Override
    public Page<DailySalesResponse> getDailySeriesPaged(LocalDate from, LocalDate to, AnalyticsLocationScope scope, Pageable pageable) {
        if (!scope.visible()) {
            return Page.empty(pageable);
        }
        return dailySalesRepo.findByDateRangePaged(from, to, scope.allLocations(), scope.locationIds(), pageable)
                .map(this::entityToResponse);
    }

    // ── Convenience wrappers ───────────────────────────────────────────────────
    // NOTE: These do NOT go through the @Cacheable proxy (self-invocation).
    // They are lightweight wrappers — callers that need caching should inject
    // SalesAnalyticsService and call getDashboardSummary() directly.

    @Override
    public DashboardSummaryResponse getWeeklySummary(AnalyticsLocationScope scope) {
        LocalDate to   = BusinessTime.today();
        LocalDate from = to.minusDays(6);
        if (!scope.visible()) {
            return buildDashboardResponse(from, to, null, List.of());
        }
        var kpi = dailySalesRepo.aggregateKpiForRange(from, to, scope.allLocations(), scope.locationIds());
        var series = dailySalesRepo.findSummaryByDateRange(from, to, scope.allLocations(), scope.locationIds())
                .stream().map(this::toResponse).collect(java.util.stream.Collectors.toList());
        return buildDashboardResponse(from, to, kpi, series);
    }

    @Override
    public DashboardSummaryResponse getMonthlySummary(AnalyticsLocationScope scope) {
        LocalDate to   = BusinessTime.today();
        LocalDate from = to.minusDays(29);
        if (!scope.visible()) {
            return buildDashboardResponse(from, to, null, List.of());
        }
        var kpi = dailySalesRepo.aggregateKpiForRange(from, to, scope.allLocations(), scope.locationIds());
        var series = dailySalesRepo.findSummaryByDateRange(from, to, scope.allLocations(), scope.locationIds())
                .stream().map(this::toResponse).collect(java.util.stream.Collectors.toList());
        return buildDashboardResponse(from, to, kpi, series);
    }

    private DashboardSummaryResponse buildDashboardResponse(
            LocalDate from, LocalDate to,
            DailySalesAnalyticsRepository.DashboardKpiProjection kpi,
            java.util.List<DailySalesResponse> series) {
        if (kpi == null) {
            return new DashboardSummaryResponse(
                    from, to,
                    BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO,
                    0L, 0L, 0L, BigDecimal.ZERO,
                    0L, 0L, 0L,
                    BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO,
                    series,
                    BigDecimal.ZERO, BigDecimal.ZERO, null);
        }
        return new DashboardSummaryResponse(
                from, to,
                nullSafe(kpi.getTotalRevenue()),
                nullSafe(kpi.getNetRevenue()),
                nullSafe(kpi.getTotalDiscount()),
                nullSafeLong(kpi.getTotalOrders()),
                nullSafeLong(kpi.getCompletedOrders()),
                nullSafeLong(kpi.getCancelledOrders()),
                nullSafe(kpi.getAverageOrderValue()),
                nullSafeLong(kpi.getUniqueCustomers()),
                nullSafeLong(kpi.getNewCustomers()),
                nullSafeLong(kpi.getTotalItemsSold()),
                nullSafe(kpi.getWalletRevenue()),
                nullSafe(kpi.getOnlineRevenue()),
                nullSafe(kpi.getCodRevenue()),
                series,
                nullSafe(kpi.getTotalEstimatedCost()),
                nullSafe(kpi.getTotalEstimatedProfit()),
                kpi.getAvgProfitMargin()
        );
    }

    // ── Mappers ────────────────────────────────────────────────────────────────

    private DailySalesResponse kpiToDailyResponse(LocalDate date, DailySalesAnalyticsRepository.DashboardKpiProjection kpi) {
        return new DailySalesResponse(
                date,
                (int) nullSafeLong(kpi.getTotalOrders()),
                (int) nullSafeLong(kpi.getCompletedOrders()),
                (int) nullSafeLong(kpi.getCancelledOrders()),
                nullSafe(kpi.getTotalRevenue()),
                nullSafe(kpi.getNetRevenue()),
                nullSafe(kpi.getTotalDiscount()),
                nullSafe(kpi.getAverageOrderValue()),
                (int) nullSafeLong(kpi.getUniqueCustomers()),
                (int) nullSafeLong(kpi.getNewCustomers()),
                (int) nullSafeLong(kpi.getTotalItemsSold()),
                nullSafe(kpi.getWalletRevenue()),
                nullSafe(kpi.getOnlineRevenue()),
                nullSafe(kpi.getCodRevenue()),
                nullSafe(kpi.getTotalEstimatedCost()),
                nullSafe(kpi.getTotalEstimatedProfit()),
                kpi.getAvgProfitMargin()
        );
    }

    private DailySalesResponse toResponse(DailySalesSummaryProjection p) {
        return new DailySalesResponse(
                p.getSalesDate(),
                nullSafeInt(p.getTotalOrders()),
                nullSafeInt(p.getCompletedOrders()),
                nullSafeInt(p.getCancelledOrders()),
                nullSafe(p.getTotalRevenue()),
                nullSafe(p.getNetRevenue()),
                nullSafe(p.getTotalDiscount()),
                nullSafe(p.getAverageOrderValue()),
                nullSafeInt(p.getUniqueCustomers()),
                nullSafeInt(p.getNewCustomers()),
                nullSafeInt(p.getTotalItemsSold()),
                BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO,  // payment channels — not in summary projection
                BigDecimal.ZERO, BigDecimal.ZERO, null              // profit fields — not in summary projection
        );
    }

    private DailySalesResponse entityToResponse(DailySalesAnalytics e) {
        return new DailySalesResponse(
                e.getSalesDate(),
                e.getTotalOrders(),
                e.getCompletedOrders(),
                e.getCancelledOrders(),
                e.getTotalRevenue(),
                e.getNetRevenue(),
                e.getTotalDiscount(),
                e.getAverageOrderValue(),
                e.getUniqueCustomers(),
                e.getNewCustomers(),
                e.getTotalItemsSold(),
                e.getWalletRevenue(),
                e.getOnlineRevenue(),
                e.getCodRevenue(),
                e.getTotalEstimatedCost(),
                e.getTotalEstimatedProfit(),
                e.getAvgProfitMargin()
        );
    }

    // ── Null-safe helpers ──────────────────────────────────────────────────────

    private BigDecimal nullSafe(BigDecimal v) { return v != null ? v : BigDecimal.ZERO; }
    private long       nullSafeLong(Number v) { return v != null ? v.longValue() : 0L; }
    private int        nullSafeInt(Number v)  { return v != null ? v.intValue()  : 0;  }
}
