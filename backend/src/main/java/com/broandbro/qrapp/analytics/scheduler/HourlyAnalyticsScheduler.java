package com.broandbro.qrapp.analytics.scheduler;

import com.broandbro.qrapp.analytics.config.AnalyticsCacheConfig;
import com.broandbro.qrapp.analytics.repository.HourlyOrderAnalyticsRepository;
import com.broandbro.qrapp.ops.SchedulerJobIds;
import com.broandbro.qrapp.ops.SchedulerRunRecorder;
import com.broandbro.qrapp.time.BusinessTime;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.CacheManager;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
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
    private final SchedulerRunRecorder runRecorder;

    // ── Scheduled job ──────────────────────────────────────────────────────────

    /**
     * Fires every hour at :02 (configurable via {@code analytics.cron.hourly-orders}).
     * Upserts the previous full hour and the current partial hour.
     */
   @Scheduled(cron = "${analytics.cron.hourly-orders:0 2 * * * *}",
               zone = "Asia/Kolkata")
    public void computeCurrentHourSnapshot() {
        runRecorder.runScheduled(SchedulerJobIds.HOURLY_ANALYTICS, () -> {
            LocalDateTime now = BusinessTime.now();
            LocalDate today  = now.toLocalDate();
            int currentHour  = now.getHour();

            log.info("[HourlyScheduler] Running for date={} hour={}", today, currentHour);

            // Each bucket is attempted even if an earlier one fails; the run is marked failed at the end.
            List<String> failures = new ArrayList<>();

            // 1. Finalize the previous completed hour (if not midnight)
            if (currentHour > 0) {
               attempt(failures, today, currentHour - 1);
            } else {
               // Midnight edge: finalise hour 23 of the previous day
               attempt(failures, today.minusDays(1), 23);
            }

            // 2. Refresh current partial hour for live dashboard accuracy
            attempt(failures, today, currentHour);

            evictHourlyCaches();

            if (!failures.isEmpty()) {
               throw new IllegalStateException("Hourly bucket upsert failed for: " + String.join(", ", failures));
            }
        });
    }

    // ── Public API ─────────────────────────────────────────────────────────────

    public void executeUpsert(LocalDate date, int hour) {
        long start = System.currentTimeMillis();
        try {
            hourlyRepo.upsertHourlySnapshot(date, hour);
            long elapsed = System.currentTimeMillis() - start;
            log.debug("[HourlyScheduler] Upserted bucket date={} hour={} in {}ms", date, hour, elapsed);
        } catch (RuntimeException ex) {
            log.error("[HourlyScheduler] Failed to upsert bucket date={} hour={}: {}",
                   date, hour, ex.getMessage(), ex);
            throw ex;
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

    private void attempt(List<String> failures, LocalDate date, int hour) {
        try {
            executeUpsert(date, hour);
        } catch (RuntimeException ex) {
            failures.add(date + " hour " + hour);
        }
    }

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
