package com.broandbro.qrapp.analytics.scheduler;

import com.broandbro.qrapp.analytics.config.AnalyticsCacheConfig;
import com.broandbro.qrapp.analytics.repository.DailySalesAnalyticsRepository;
import com.broandbro.qrapp.ops.SchedulerJobIds;
import com.broandbro.qrapp.ops.SchedulerRunRecorder;
import com.broandbro.qrapp.time.BusinessTime;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

/**
 * Computes and materialises the daily sales snapshot for yesterday (default)
 * and, on-demand, for any target date.
 *
 * <p>Execution is idempotent — the underlying repository uses
 * {@code INSERT ... ON CONFLICT DO UPDATE}, so re-running for the same date
 * is safe and simply refreshes the row.</p>
 */
@Slf4j
@Component
public class DailySalesAggregationScheduler {

    private final DailySalesAnalyticsRepository dailySalesRepo;
    private final CacheManager analyticsCacheManager;
    private final SchedulerRunRecorder runRecorder;

    public DailySalesAggregationScheduler(
            DailySalesAnalyticsRepository dailySalesRepo,
            @Qualifier("analyticsCacheManager") CacheManager analyticsCacheManager,
            SchedulerRunRecorder runRecorder) {
        this.dailySalesRepo = dailySalesRepo;
        this.analyticsCacheManager = analyticsCacheManager;
        this.runRecorder = runRecorder;
    }

    // ── Scheduled job ──────────────────────────────────────────────────────────

    /**
     * Runs every day at 00:05 (configurable via {@code analytics.cron.daily-sales}).
     * Aggregates the previous full day's orders.
     */
    @Scheduled(cron = "${analytics.cron.daily-sales:0 5 0 * * *}",
               zone = "Asia/Kolkata")
    public void computeYesterdaySnapshot() {
        runRecorder.runScheduled(SchedulerJobIds.DAILY_SALES, () -> {
            LocalDate yesterday = BusinessTime.today().minusDays(1);
            log.info("[DailySalesScheduler] Starting daily snapshot for {}", yesterday);
            executeUpsert(yesterday);
        });
    }

    /**
     * Backfill: compute snapshot for today's partial data mid-day.
     * Intended to be triggered manually or via a management endpoint.
     */
    @Scheduled(cron = "${analytics.cron.daily-sales-intraday:0 0 12 * * *}",
               zone = "Asia/Kolkata")
    public void computeTodayPartialSnapshot() {
        runRecorder.runScheduled(SchedulerJobIds.DAILY_SALES_INTRADAY, () -> {
            LocalDate today = BusinessTime.today();
            log.info("[DailySalesScheduler] Refreshing intraday snapshot for {}", today);
            executeUpsert(today);
        });
    }

    // ── Public API for manual / backfill triggers ──────────────────────────────

    /**
     * Upserts the snapshot for the given date and evicts related caches.
     * Called by schedulers and can also be called programmatically.
     */
    public void executeUpsert(LocalDate targetDate) {
        long start = System.currentTimeMillis();
        try {
            dailySalesRepo.upsertDailySnapshot(targetDate);
            evictDailyCaches();
            long elapsed = System.currentTimeMillis() - start;
            log.info("[DailySalesScheduler] Snapshot complete for {} in {}ms", targetDate, elapsed);
        } catch (RuntimeException ex) {
            log.error("[DailySalesScheduler] Failed to compute snapshot for {}: {}",
                    targetDate, ex.getMessage(), ex);
            throw ex;
        }
    }

    /**
     * Backfills snapshots for a date range. Processes each date sequentially to
     * avoid overloading the DB connection pool.
     */
    public void backfill(LocalDate from, LocalDate to) {
        log.info("[DailySalesScheduler] Backfill requested from {} to {}", from, to);
        LocalDate cursor = from;
        int success = 0, failed = 0;
        while (!cursor.isAfter(to)) {
            try {
                dailySalesRepo.upsertDailySnapshot(cursor);
                success++;
            } catch (Exception ex) {
                log.error("[DailySalesScheduler] Backfill failed for {}: {}", cursor, ex.getMessage());
                failed++;
            }
            cursor = cursor.plusDays(1);
        }
        evictDailyCaches();
        log.info("[DailySalesScheduler] Backfill done. success={}, failed={}", success, failed);
    }

    // ── Private helpers ────────────────────────────────────────────────────────

    private void evictDailyCaches() {
        evict(AnalyticsCacheConfig.CACHE_DAILY_SALES);
        evict(AnalyticsCacheConfig.CACHE_DASHBOARD);
    }

    private void evict(String cacheName) {
        Cache cache = analyticsCacheManager.getCache(cacheName);
        if (cache == null) {
            log.warn("[DailySalesScheduler] Cache '{}' not found — skipping eviction", cacheName);
            return;
        }
        cache.clear();
        log.debug("[DailySalesScheduler] Evicted cache '{}'", cacheName);
    }
}
