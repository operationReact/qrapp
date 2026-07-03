package com.broandbro.qrapp.analytics.service;

import com.broandbro.qrapp.analytics.config.AnalyticsCacheConfig;
import com.broandbro.qrapp.analytics.dto.HourlyOrderResponse;
import com.broandbro.qrapp.analytics.dto.PeakHourResponse;
import com.broandbro.qrapp.analytics.projection.HourlyOrderSummaryProjection;
import com.broandbro.qrapp.analytics.repository.HourlyOrderAnalyticsRepository;
import com.broandbro.qrapp.analytics.scheduler.HourlyAnalyticsScheduler;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.OptionalDouble;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OrderAnalyticsServiceImpl implements OrderAnalyticsService {

    private final HourlyOrderAnalyticsRepository hourlyRepo;

    /** Lazy to break the potential circular dependency (scheduler → service → scheduler). */
    @Lazy
    private final HourlyAnalyticsScheduler scheduler;

    // ── GET /hourly ─────────────────────────────────────────────────────────────

    @Override
    @Cacheable(
        cacheManager = "analyticsCacheManager",
        cacheNames   = AnalyticsCacheConfig.CACHE_HOURLY_ORDERS,
        key           = "'daily:' + #date"
    )
    public List<HourlyOrderResponse> getHourlyBreakdown(LocalDate date) {
        LocalDateTime now        = LocalDateTime.now();
        LocalDate     today      = now.toLocalDate();
        int           currentHour = now.getHour();

        // Always refresh the current partial hour so very-recent orders appear immediately.
        // For past dates, also refresh hour 23 to close any open bucket.
        if (date.equals(today)) {
            scheduler.executeUpsert(today, currentHour);
            if (currentHour > 0) {
                scheduler.executeUpsert(today, currentHour - 1);
            }
        }

        return hourlyRepo.findByOrderDateOrderByHourOfDayAsc(date)
                .stream()
                .map(e -> new HourlyOrderResponse(
                        e.getOrderDate(), e.getHourOfDay(), e.getDayOfWeek(),
                        e.getOrderCount(), e.getCompletedCount(),
                        e.getHourRevenue(), e.getAvgFulfilmentMinutes()))
                .collect(Collectors.toList());
    }

    @Override
    @Cacheable(
        cacheManager = "analyticsCacheManager",
        cacheNames   = AnalyticsCacheConfig.CACHE_HOURLY_ORDERS,
        key           = "'range:' + #from + ':' + #to"
    )
    public List<HourlyOrderResponse> getHourlyBreakdownRange(LocalDate from, LocalDate to) {
        log.debug("[OrderService] getHourlyBreakdownRange from={} to={}", from, to);
        refreshCurrentHourIfTodayInRange(to);
        return hourlyRepo.findHeatmapByDateRange(from, to)
                .stream()
                .map(p -> new HourlyOrderResponse(
                        null, p.getHourOfDay(), p.getDayOfWeek(),
                        p.getTotalOrderCount(), p.getTotalCompletedCount(),
                        nullSafe(p.getTotalRevenue()), p.getAvgFulfilmentMinutes()))
                .collect(Collectors.toList());
    }

    @Override
    @Cacheable(
        cacheManager = "analyticsCacheManager",
        cacheNames   = AnalyticsCacheConfig.CACHE_PEAK_HOURS,
        key           = "'peaks:' + #from + ':' + #to"
    )
    public List<PeakHourResponse> getPeakHours(LocalDate from, LocalDate to) {
        log.debug("[OrderService] getPeakHours from={} to={}", from, to);
        refreshCurrentHourIfTodayInRange(to);
        List<HourlyOrderSummaryProjection> all = hourlyRepo.findHeatmapByDateRange(from, to);

        // Compute average order count across all hour buckets
        OptionalDouble avgOpt = all.stream()
                .mapToLong(HourlyOrderSummaryProjection::getTotalOrderCount)
                .average();
        double avg = avgOpt.orElse(0);

        return all.stream()
                .sorted((a, b) -> Long.compare(b.getTotalOrderCount(), a.getTotalOrderCount()))
                .map(p -> new PeakHourResponse(
                        p.getHourOfDay(),
                        hourLabel(p.getHourOfDay()),
                        p.getDayOfWeek(),
                        p.getTotalOrderCount(),
                        p.getTotalCompletedCount(),
                        nullSafe(p.getTotalRevenue()),
                        p.getAvgFulfilmentMinutes(),
                        p.getTotalOrderCount() > avg
                ))
                .collect(Collectors.toList());
    }

    // ── Private helpers ────────────────────────────────────────────────────────

    /**
     * When the requested range includes today, upsert the current (and previous)
     * partial hour so that orders placed in the last few minutes are visible
     * immediately without waiting for the hourly scheduler.
     */
    private void refreshCurrentHourIfTodayInRange(LocalDate to) {
        LocalDate today = LocalDate.now();
        if (!to.isBefore(today)) {               // range includes today
            int currentHour = LocalDateTime.now().getHour();
            scheduler.executeUpsert(today, currentHour);
            if (currentHour > 0) {
                scheduler.executeUpsert(today, currentHour - 1);
            }
        }
    }

    private String hourLabel(int hour) {
        return String.format("%02d:00 – %02d:59", hour, hour);
    }

    private BigDecimal nullSafe(BigDecimal v) {
        return v != null ? v : BigDecimal.ZERO;
    }
}

