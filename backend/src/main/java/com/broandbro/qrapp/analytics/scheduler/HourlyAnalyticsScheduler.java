package com.broandbro.qrapp.analytics.scheduler;

import com.broandbro.qrapp.analytics.config.AnalyticsCacheConfig;
import com.broandbro.qrapp.analytics.repository.HourlyOrderAnalyticsRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.CacheManager;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Objects;

/**
 * Materialises the hourly order bucket for the most recently completed hour.
 *
 * <p>Runs every hour at HH:02. Computes the bucket for HH-1 so the full
 * hour's data is available. Also upserts the current hour's partial data
 * to keep the live dashboard fresh.</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class HourlyAnalyticsScheduler {

    private final HourlyOrderAnalyticsRepository hourlyRepo;
    private final CacheManager analyticsCacheManager;

    // ── Scheduled job ──────────────────────────────────────────────────────────

    /**
     * Fires every hour at :02 (configurable via {@code analytics.cron.hourly-orders}).
     * Upserts the previous full hour and the current partial hour.
     */
   @Scheduled(cron = "${analytics.cron.hourly-orders:0 * * * * *}",
               zone = "Asia/Kolkata")
    public void computeCurrentHourSnapshot() {
        LocalDateTime now = LocalDateTime.now();
        LocalDate today  = now.toLocalDate();
        int currentHour  = now.getHour();

        log.info("[HourlyScheduler] Running for date={} hour={}", today, currentHour);

        // 1. Finalize the previous completed hour (if not midnight)
        if (currentHour > 0) {
            executeUpsert(today, currentHour - 1);
        } else {
            // Midnight edge: finalise hour 23 of the previous day
            executeUpsert(today.minusDays(1), 23);
        }

        // 2. Refresh current partial hour for live dashboard accuracy
        executeUpsert(today, currentHour);

        evictHourlyCaches();
    }

    // ── Public API ─────────────────────────────────────────────────────────────

    public void executeUpsert(LocalDate date, int hour) {
        long start = System.currentTimeMillis();
        try {
            hourlyRepo.upsertHourlySnapshot(date, hour);
            long elapsed = System.currentTimeMillis() - start;
            log.debug("[HourlyScheduler] Upserted bucket date={} hour={} in {}ms", date, hour, elapsed);
        } catch (Exception ex) {
            log.error("[HourlyScheduler] Failed to upsert bucket date={} hour={}: {}",
                    date, hour, ex.getMessage(), ex);
        }
    }

    /**
     * Backfills all 24 hourly buckets for the given date.
     */
    public void backfillDay(LocalDate date) {
        log.info("[HourlyScheduler] Backfilling all hours for {}", date);
        int success = 0, failed = 0;
        for (int h = 0; h < 24; h++) {
            try {
                hourlyRepo.upsertHourlySnapshot(date, h);
                success++;
            } catch (Exception ex) {
                log.error("[HourlyScheduler] Backfill failed for date={} hour={}: {}", date, h, ex.getMessage());
                failed++;
            }
        }
        evictHourlyCaches();
        log.info("[HourlyScheduler] Backfill done for {}. success={}, failed={}", date, success, failed);
    }

    // ── Private helpers ────────────────────────────────────────────────────────

    private void evictHourlyCaches() {
        evict(AnalyticsCacheConfig.CACHE_HOURLY_ORDERS);
        evict(AnalyticsCacheConfig.CACHE_PEAK_HOURS);
    }

    private void evict(String cacheName) {
        var cache = analyticsCacheManager.getCache(cacheName);
        if (cache != null) {
            cache.clear();
            log.debug("[HourlyScheduler] Evicted cache '{}'", cacheName);
        } else {
            log.debug("[HourlyScheduler] Cache '{}' not found, skipping eviction", cacheName);
        }
    }
}

