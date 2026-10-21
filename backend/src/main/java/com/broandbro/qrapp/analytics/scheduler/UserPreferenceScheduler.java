package com.broandbro.qrapp.analytics.scheduler;

import com.broandbro.qrapp.analytics.config.AnalyticsCacheConfig;
import com.broandbro.qrapp.analytics.repository.UserPreferenceAnalyticsRepository;
import com.broandbro.qrapp.ops.SchedulerJobIds;
import com.broandbro.qrapp.ops.SchedulerRunRecorder;
import com.broandbro.qrapp.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.cache.CacheManager;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Rebuilds the per-user preference and segmentation snapshot.
 *
 * <p>Processes users in batches of 500 to avoid memory pressure.
 * Each user upsert runs a single CTE query in PostgreSQL —
 * there is no N+1 at the Java level.</p>
 *
 * <p>The churn flag, RFM segment, and preferred item/category IDs are all
 * recomputed in the DB in one atomic operation per user.</p>
 */
@Slf4j
@Component
public class UserPreferenceScheduler {

    private static final int BATCH_SIZE = 500;

    private final UserPreferenceAnalyticsRepository userPrefRepo;
    private final UserRepository userRepository;
    private final CacheManager analyticsCacheManager;
    private final SchedulerRunRecorder runRecorder;

    public UserPreferenceScheduler(
            UserPreferenceAnalyticsRepository userPrefRepo,
            UserRepository userRepository,
            @Qualifier("analyticsCacheManager") CacheManager analyticsCacheManager,
            SchedulerRunRecorder runRecorder) {
        this.userPrefRepo = userPrefRepo;
        this.userRepository = userRepository;
        this.analyticsCacheManager = analyticsCacheManager;
        this.runRecorder = runRecorder;
    }

    // ── Scheduled job ──────────────────────────────────────────────────────────

    /**
     * Runs daily at 01:00 (configurable via {@code analytics.cron.user-preferences}).
     * Full rebuild of all user preference snapshots.
     */
    @Scheduled(cron = "${analytics.cron.user-preferences:0 0 1 * * *}",
               zone = "Asia/Kolkata")
    public void rebuildAllUserSnapshots() {
        runRecorder.runScheduled(SchedulerJobIds.USER_PREFERENCES, this::rebuildAllSnapshotsNow);
    }

    private void rebuildAllSnapshotsNow() {
        log.info("[UserPrefScheduler] Starting full user preference rebuild");
        long start  = System.currentTimeMillis();
        int  page   = 0;
        int  total  = 0;
        int  failed = 0;

        while (true) {
            // Fetch a page of user IDs — avoids loading full User entities
            List<Long> userIds = userRepository
                    .findAllIds(PageRequest.of(page, BATCH_SIZE));

            if (userIds.isEmpty()) break;

            log.debug("[UserPrefScheduler] Processing batch page={} size={}", page, userIds.size());

            for (Long userId : userIds) {
                try {
                    userPrefRepo.upsertUserSnapshot(userId);
                    total++;
                } catch (Exception ex) {
                    log.error("[UserPrefScheduler] Failed for userId={}: {}", userId, ex.getMessage());
                    failed++;
                }
            }
            page++;
        }

        evictUserCaches();
        long elapsed = System.currentTimeMillis() - start;
        log.info("[UserPrefScheduler] Rebuild done. total={}, failed={}, elapsed={}ms",
                total, failed, elapsed);
        if (failed > 0) {
            throw new IllegalStateException(failed + " of " + (total + failed) + " user snapshots failed");
        }
    }

    // ── Public API ─────────────────────────────────────────────────────────────

    /**
     * Upserts a single user's snapshot — called immediately after an order
     * event so the user's profile is always up to date.
     */
    public void refreshUser(Long userId) {
        try {
            userPrefRepo.upsertUserSnapshot(userId);
            evictUserCaches();
            log.debug("[UserPrefScheduler] Refreshed snapshot for userId={}", userId);
        } catch (Exception ex) {
            log.error("[UserPrefScheduler] Failed to refresh userId={}: {}", userId, ex.getMessage(), ex);
        }
    }

    // ── Private helpers ────────────────────────────────────────────────────────

    private void evictUserCaches() {
        evict(AnalyticsCacheConfig.CACHE_USER_SEGMENT);
        evict(AnalyticsCacheConfig.CACHE_RECOMMENDATIONS);
        evict(AnalyticsCacheConfig.CACHE_DASHBOARD);
    }

    private void evict(String cacheName) {
        var cache = analyticsCacheManager.getCache(cacheName);
        if (cache != null) {
            cache.clear();
            log.debug("[UserPrefScheduler] Evicted cache '{}'", cacheName);
        } else {
            log.warn("[UserPrefScheduler] Cache '{}' not found — skipping eviction", cacheName);
        }
    }
}

