package com.broandbro.qrapp.analytics.scheduler;

import com.broandbro.qrapp.analytics.config.AnalyticsCacheConfig;
import com.broandbro.qrapp.analytics.repository.MenuItemAnalyticsRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.CacheManager;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

/**
 * Materialises per-menu-item sales snapshots once per day.
 *
 * <p>Uses a single CTE query with RANK() window function to compute item
 * and category ranks in one pass — no N+1, no in-memory sorting.</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class MenuAnalyticsScheduler {

    private final MenuItemAnalyticsRepository menuItemRepo;
    private final CacheManager analyticsCacheManager;

    // ── Scheduled job ──────────────────────────────────────────────────────────

    /**
     * Runs at 00:10 every day (configurable via {@code analytics.cron.menu-items}).
     * Computes the previous day's item performance.
     */
    @Scheduled(cron = "${analytics.cron.menu-items:0 */2 * * * *}",
               zone = "Asia/Kolkata")
    public void computeYesterdaySnapshot() {
        LocalDate yesterday = LocalDate.now().minusDays(1);
        log.info("[MenuAnalyticsScheduler] Starting snapshot for {}", yesterday);
        executeUpsert(yesterday);
    }

    /**
     * Mid-day refresh so the "Today's top sellers" widget stays current.
     */
    @Scheduled(cron = "${analytics.cron.menu-items-intraday:0 30 12 * * *}",
               zone = "Asia/Kolkata")
    public void computeTodayPartialSnapshot() {
        LocalDate today = LocalDate.now();
        log.info("[MenuAnalyticsScheduler] Intraday refresh for {}", today);
        executeUpsert(today);
    }

    // ── Public API ─────────────────────────────────────────────────────────────

    public void executeUpsert(LocalDate targetDate) {
        long start = System.currentTimeMillis();
        try {
            menuItemRepo.upsertMenuItemSnapshot(targetDate);
            evictMenuCaches();
            long elapsed = System.currentTimeMillis() - start;
            log.info("[MenuAnalyticsScheduler] Snapshot complete for {} in {}ms", targetDate, elapsed);
        } catch (Exception ex) {
            log.error("[MenuAnalyticsScheduler] Failed for {}: {}", targetDate, ex.getMessage(), ex);
        }
    }

    public void backfill(LocalDate from, LocalDate to) {
        log.info("[MenuAnalyticsScheduler] Backfill {} to {}", from, to);
        LocalDate cursor = from;
        int success = 0, failed = 0;
        while (!cursor.isAfter(to)) {
            try {
                menuItemRepo.upsertMenuItemSnapshot(cursor);
                success++;
            } catch (Exception ex) {
                log.error("[MenuAnalyticsScheduler] Backfill failed for {}: {}", cursor, ex.getMessage());
                failed++;
            }
            cursor = cursor.plusDays(1);
        }
        evictMenuCaches();
        log.info("[MenuAnalyticsScheduler] Backfill done. success={}, failed={}", success, failed);
    }

    // ── Private helpers ────────────────────────────────────────────────────────

    private void evictMenuCaches() {
        evict(AnalyticsCacheConfig.CACHE_TOP_ITEMS);
        evict(AnalyticsCacheConfig.CACHE_CATEGORY_ROLLUP);
        evict(AnalyticsCacheConfig.CACHE_RECOMMENDATIONS);
    }

    private void evict(String cacheName) {
        var cache = analyticsCacheManager.getCache(cacheName);
        if (cache != null) {
            cache.clear();
            log.debug("[MenuAnalyticsScheduler] Evicted cache '{}'", cacheName);
        } else {
            log.debug("[MenuAnalyticsScheduler] Cache '{}' not found, skipping eviction", cacheName);
        }
    }
}

