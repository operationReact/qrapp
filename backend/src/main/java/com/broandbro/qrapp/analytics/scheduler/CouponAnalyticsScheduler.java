package com.broandbro.qrapp.analytics.scheduler;

import com.broandbro.qrapp.analytics.config.AnalyticsCacheConfig;
import com.broandbro.qrapp.analytics.repository.CouponAnalyticsRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.CacheManager;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.Objects;

/**
 * Materialises daily coupon performance snapshots.
 *
 * <p>One upsert per day covers all active coupons. The native query computes
 * conversion rates, discount cost ratios, and abuse signals in a single pass.</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CouponAnalyticsScheduler {

    private final CouponAnalyticsRepository couponAnalyticsRepo;
    private final CacheManager analyticsCacheManager;

    // ── Scheduled job ──────────────────────────────────────────────────────────

    /**
     * Runs daily at 00:15 (configurable via {@code analytics.cron.coupon-analytics}).
     */
    @Scheduled(cron = "${analytics.cron.coupon-analytics:0 15 0 * * *}",
               zone = "Asia/Kolkata")
    public void computeYesterdaySnapshot() {
        LocalDate yesterday = LocalDate.now().minusDays(1);
        log.info("[CouponAnalyticsScheduler] Starting snapshot for {}", yesterday);
        executeUpsert(yesterday);
    }

    /**
     * Intraday refresh — keeps live coupon abuse detection current.
     */
    @Scheduled(cron = "${analytics.cron.coupon-analytics-intraday:0 0 */6 * * *}",
               zone = "Asia/Kolkata")
    public void computeTodayPartialSnapshot() {
        LocalDate today = LocalDate.now();
        log.info("[CouponAnalyticsScheduler] Intraday refresh for {}", today);
        executeUpsert(today);
    }

    // ── Public API ─────────────────────────────────────────────────────────────

    public void executeUpsert(LocalDate targetDate) {
        long start = System.currentTimeMillis();
        try {
            couponAnalyticsRepo.upsertCouponSnapshot(targetDate);
            evictCouponCaches();
            long elapsed = System.currentTimeMillis() - start;
            log.info("[CouponAnalyticsScheduler] Snapshot complete for {} in {}ms", targetDate, elapsed);
        } catch (Exception ex) {
            log.error("[CouponAnalyticsScheduler] Failed for {}: {}", targetDate, ex.getMessage(), ex);
        }
    }

    public void backfill(LocalDate from, LocalDate to) {
        log.info("[CouponAnalyticsScheduler] Backfill {} to {}", from, to);
        LocalDate cursor = from;
        int success = 0, failed = 0;
        while (!cursor.isAfter(to)) {
            try {
                couponAnalyticsRepo.upsertCouponSnapshot(cursor);
                success++;
            } catch (Exception ex) {
                log.error("[CouponAnalyticsScheduler] Backfill failed for {}: {}", cursor, ex.getMessage());
                failed++;
            }
            cursor = cursor.plusDays(1);
        }
        evictCouponCaches();
        log.info("[CouponAnalyticsScheduler] Backfill done. success={}, failed={}", success, failed);
    }

    // ── Private helpers ────────────────────────────────────────────────────────

    private void evictCouponCaches() {
        evict(AnalyticsCacheConfig.CACHE_COUPON_PERF);
        evict(AnalyticsCacheConfig.CACHE_DASHBOARD);
    }

    private void evict(String cacheName) {
        Objects.requireNonNull(analyticsCacheManager.getCache(cacheName)).clear();
        log.debug("[CouponAnalyticsScheduler] Evicted cache '{}'", cacheName);
    }
}

