package com.broandbro.qrapp.ops;

import com.broandbro.qrapp.analytics.config.AnalyticsCacheConfig;
import com.broandbro.qrapp.analytics.scheduler.*;
import com.broandbro.qrapp.recommendation.scheduler.CoOccurrenceScheduler;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.cache.CacheManager;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Central registry for all background scheduler jobs.
 *
 * <p>Tracks per-job execution state (IDLE / RUNNING / SUCCESS / FAILED),
 * provides a thread-safe manual trigger API, and maintains an in-memory
 * audit log (last {@value #AUDIT_MAX} entries) for the Operations Console.</p>
 */
@Service
@Slf4j
public class SchedulerRegistry {

    // ── Inner types ────────────────────────────────────────────────────────────

    public enum JobStatus { IDLE, RUNNING, SUCCESS, FAILED }

    public record JobDefinition(
            String id,
            String name,
            String description,
            String category,
            String schedule,
            String warningMessage) {

        public JobDefinition(String id, String name, String description,
                             String category, String schedule) {
            this(id, name, description, category, schedule, null);
        }
    }

    public static class JobState {
        public volatile JobStatus status = JobStatus.IDLE;
        public volatile Instant lastRunAt;
        public volatile Instant lastSuccessAt;
        public volatile Instant lastFailedAt;
        public volatile long durationMs;
        public volatile String lastError;
        public final AtomicBoolean running = new AtomicBoolean(false);
    }

    public record JobSummary(
            String id,
            String name,
            String description,
            String category,
            String schedule,
            String warningMessage,
            String status,
            Instant lastRunAt,
            Instant lastSuccessAt,
            Instant lastFailedAt,
            long durationMs,
            String lastError) {}

    public record AuditEntry(
            String id,
            String jobId,
            String jobName,
            String status,
            Instant triggeredAt,
            Instant completedAt,
            long durationMs,
            String triggeredBy,
            String notes) {}

    public record TriggerResult(String jobId, String status, Instant triggeredAt, String message) {}

    public record SyncResult(String type, String message, Instant completedAt) {}

    public record HealthStatus(
            Map<String, Object> application,
            Map<String, Object> database,
            Map<String, Object> mainCache,
            Map<String, Object> analyticsCache,
            Map<String, Object> schedulers,
            Instant checkedAt) {}

    // ── Constants ──────────────────────────────────────────────────────────────

    private static final int AUDIT_MAX = 200;

    // ── Scheduler beans ────────────────────────────────────────────────────────

    private final DailySalesAggregationScheduler dailySalesScheduler;
    private final HourlyAnalyticsScheduler hourlyScheduler;
    private final MenuAnalyticsScheduler menuScheduler;
    private final CouponAnalyticsScheduler couponScheduler;
    private final UserPreferenceScheduler userPrefScheduler;
    private final CoOccurrenceScheduler coOccurrenceScheduler;
    private final CacheManager analyticsCacheManager;
    private final CacheManager cacheManager;

    public SchedulerRegistry(
            DailySalesAggregationScheduler dailySalesScheduler,
            HourlyAnalyticsScheduler hourlyScheduler,
            MenuAnalyticsScheduler menuScheduler,
            CouponAnalyticsScheduler couponScheduler,
            UserPreferenceScheduler userPrefScheduler,
            CoOccurrenceScheduler coOccurrenceScheduler,
            @Qualifier("analyticsCacheManager") CacheManager analyticsCacheManager,
            CacheManager cacheManager) {
        this.dailySalesScheduler = dailySalesScheduler;
        this.hourlyScheduler = hourlyScheduler;
        this.menuScheduler = menuScheduler;
        this.couponScheduler = couponScheduler;
        this.userPrefScheduler = userPrefScheduler;
        this.coOccurrenceScheduler = coOccurrenceScheduler;
        this.analyticsCacheManager = analyticsCacheManager;
        this.cacheManager = cacheManager;
    }

    // ── Job definitions ────────────────────────────────────────────────────────

    private final List<JobDefinition> jobDefinitions = List.of(
            new JobDefinition(
                    "daily-sales",
                    "Daily Sales Snapshot",
                    "Aggregates the previous day's orders into the daily sales analytics table. Safe to re-run — uses upsert logic.",
                    "Analytics",
                    "Daily at 00:05 IST"),
            new JobDefinition(
                    "daily-sales-intraday",
                    "Intraday Sales Refresh",
                    "Refreshes today's partial sales data to keep dashboards current. Runs automatically at noon.",
                    "Analytics",
                    "Daily at 12:00 IST"),
            new JobDefinition(
                    "hourly-analytics",
                    "Hourly Order Analytics",
                    "Materialises order counts and fulfilment stats for the most recently completed hour.",
                    "Analytics",
                    "Hourly at :02"),
            new JobDefinition(
                    "menu-analytics",
                    "Menu Item Analytics",
                    "Computes per-item sales ranks, revenue contribution, and category-level rollups for yesterday.",
                    "Analytics",
                    "Daily at 00:10 IST"),
            new JobDefinition(
                    "menu-analytics-intraday",
                    "Menu Analytics Intraday",
                    "Refreshes today's menu item performance snapshot. Keeps the top-sellers widget current.",
                    "Analytics",
                    "Daily at 12:30 IST"),
            new JobDefinition(
                    "coupon-analytics",
                    "Coupon Performance Analytics",
                    "Computes coupon usage rates, conversion, discount cost ratios, and abuse signals for yesterday.",
                    "Analytics",
                    "Daily at 00:15 IST"),
            new JobDefinition(
                    "user-preferences",
                    "User Preference Rebuild",
                    "Full rebuild of user segmentation, churn flags, RFM scores, and preference data for all users.",
                    "Analytics",
                    "Daily at 01:00 IST",
                    "This job processes all users and may take several minutes on large datasets."),
            new JobDefinition(
                    "co-occurrence",
                    "Recommendation Engine",
                    "Mines 90-day co-purchase patterns to refresh recommendation candidates. Runs nightly.",
                    "Recommendations",
                    "Daily at 01:30 IST",
                    "This job scans 90 days of order history and may take a few minutes.")
    );

    // ── State tracking ─────────────────────────────────────────────────────────

    private final ConcurrentHashMap<String, JobState> stateMap = new ConcurrentHashMap<>();
    private final ConcurrentLinkedDeque<AuditEntry> auditLog = new ConcurrentLinkedDeque<>();

    private final ExecutorService jobExecutor = Executors.newFixedThreadPool(
            3, r -> {
                Thread t = new Thread(r, "ops-job-executor");
                t.setDaemon(true);
                return t;
            });

    @PostConstruct
    private void initState() {
        for (JobDefinition def : jobDefinitions) {
            stateMap.put(def.id(), new JobState());
        }
        log.info("[SchedulerRegistry] Initialised {} job definitions", jobDefinitions.size());
    }

    // ── Public API ─────────────────────────────────────────────────────────────

    /** Returns all job summaries (definitions merged with current execution state). */
    public List<JobSummary> getAllJobs() {
        return jobDefinitions.stream()
                .map(def -> {
                    JobState s = stateMap.get(def.id());
                    return new JobSummary(
                            def.id(), def.name(), def.description(), def.category(),
                            def.schedule(), def.warningMessage(),
                            s.status.name(),
                            s.lastRunAt, s.lastSuccessAt, s.lastFailedAt,
                            s.durationMs, s.lastError);
                })
                .toList();
    }

    /** Returns the current state for a single job. */
    public JobSummary getJob(String jobId) {
        JobDefinition def = findDef(jobId);
        if (def == null) return null;
        JobState s = stateMap.get(jobId);
        return new JobSummary(
                def.id(), def.name(), def.description(), def.category(),
                def.schedule(), def.warningMessage(),
                s.status.name(),
                s.lastRunAt, s.lastSuccessAt, s.lastFailedAt,
                s.durationMs, s.lastError);
    }

    /**
     * Triggers a job asynchronously.
     *
     * @throws IllegalArgumentException if the job ID is unknown
     * @throws IllegalStateException    if the job is already running
     */
    public TriggerResult triggerJob(String jobId, String triggeredBy) {
        JobDefinition def = findDef(jobId);
        if (def == null) {
            throw new IllegalArgumentException("Unknown job: " + jobId);
        }

        JobState state = stateMap.get(jobId);
        if (!state.running.compareAndSet(false, true)) {
            throw new IllegalStateException("Job '" + def.name() + "' is already running");
        }

        Instant triggeredAt = Instant.now();
        state.status = JobStatus.RUNNING;
        state.lastRunAt = triggeredAt;
        state.lastError = null;

        String byLabel = (triggeredBy != null && !triggeredBy.isBlank()) ? triggeredBy : "admin";
        log.info("[SchedulerRegistry] Job '{}' manually triggered by '{}'", jobId, byLabel);

        jobExecutor.submit(() -> {
            long start = System.currentTimeMillis();
            try {
                runJobLogic(jobId);
                long elapsed = System.currentTimeMillis() - start;
                state.status = JobStatus.SUCCESS;
                state.lastSuccessAt = Instant.now();
                state.durationMs = elapsed;
                state.lastError = null;
                log.info("[SchedulerRegistry] Job '{}' succeeded in {}ms", jobId, elapsed);
                appendAudit(def, "SUCCESS", triggeredAt, elapsed, byLabel, null);
            } catch (Exception ex) {
                long elapsed = System.currentTimeMillis() - start;
                state.status = JobStatus.FAILED;
                state.lastFailedAt = Instant.now();
                state.durationMs = elapsed;
                state.lastError = ex.getMessage();
                log.error("[SchedulerRegistry] Job '{}' failed after {}ms: {}", jobId, elapsed, ex.getMessage(), ex);
                appendAudit(def, "FAILED", triggeredAt, elapsed, byLabel, ex.getMessage());
            } finally {
                state.running.set(false);
            }
        });

        return new TriggerResult(jobId, "RUNNING", triggeredAt, "Job '" + def.name() + "' started");
    }

    /** Returns the audit log in reverse-chronological order (newest first). */
    public List<AuditEntry> getAuditLog() {
        return new ArrayList<>(auditLog);
    }

    /**
     * Executes a named sync operation synchronously.
     *
     * <p>Sync operations are lightweight cache-eviction and intraday-refresh
     * actions — they are safe to run at any time without disrupting live traffic.</p>
     */
    public SyncResult runSync(String type, String triggeredBy) {
        log.info("[SchedulerRegistry] Sync '{}' triggered by '{}'", type, triggeredBy);
        return switch (type) {
            case "menu" -> {
                evictCache(cacheManager, "menu");
                evictCache(cacheManager, "menuRecommended");
                evictCache(cacheManager, "combos");
                evictCache(analyticsCacheManager, AnalyticsCacheConfig.CACHE_TOP_ITEMS);
                evictCache(analyticsCacheManager, AnalyticsCacheConfig.CACHE_CATEGORY_ROLLUP);
                yield new SyncResult("menu", "Menu caches cleared. Item data will refresh on next request.", Instant.now());
            }
            case "inventory" -> {
                evictCache(cacheManager, "menu");
                yield new SyncResult("inventory", "Inventory caches cleared. Availability will refresh on next request.", Instant.now());
            }
            case "analytics" -> {
                dailySalesScheduler.computeTodayPartialSnapshot();
                hourlyScheduler.computeCurrentHourSnapshot();
                menuScheduler.computeTodayPartialSnapshot();
                couponScheduler.computeTodayPartialSnapshot();
                yield new SyncResult("analytics", "All analytics snapshots refreshed with today's data.", Instant.now());
            }
            case "recommendations" -> {
                evictCache(analyticsCacheManager, AnalyticsCacheConfig.CACHE_RECOMMENDATIONS);
                yield new SyncResult("recommendations", "Recommendation caches cleared. Use the 'Recommendation Engine' job to recompute.", Instant.now());
            }
            case "promotions" -> {
                evictCache(cacheManager, "menu");
                evictCache(cacheManager, "combos");
                yield new SyncResult("promotions", "Promotion caches cleared. Changes will reflect on next customer request.", Instant.now());
            }
            default -> throw new IllegalArgumentException("Unknown sync type: " + type);
        };
    }

    /** Returns a current system health snapshot. */
    public HealthStatus getHealth() {
        Map<String, Object> app = Map.of("status", "UP");

        Map<String, Object> mainCacheInfo = buildCacheInfo(cacheManager);
        Map<String, Object> analyticsCacheInfo = buildCacheInfo(analyticsCacheManager);

        // Scheduler summary
        long idle = 0, running = 0, success = 0, failed = 0;
        for (JobState s : stateMap.values()) {
            switch (s.status) {
                case IDLE -> idle++;
                case RUNNING -> running++;
                case SUCCESS -> success++;
                case FAILED -> failed++;
            }
        }
        Map<String, Object> schedulerInfo = new LinkedHashMap<>();
        schedulerInfo.put("total", jobDefinitions.size());
        schedulerInfo.put("idle", idle);
        schedulerInfo.put("running", running);
        schedulerInfo.put("success", success);
        schedulerInfo.put("failed", failed);

        return new HealthStatus(app, Map.of("status", "UP"), mainCacheInfo, analyticsCacheInfo, schedulerInfo, Instant.now());
    }

    // ── Private helpers ────────────────────────────────────────────────────────

    private void runJobLogic(String jobId) {
        switch (jobId) {
            case "daily-sales"             -> dailySalesScheduler.computeYesterdaySnapshot();
            case "daily-sales-intraday"    -> dailySalesScheduler.computeTodayPartialSnapshot();
            case "hourly-analytics"        -> hourlyScheduler.computeCurrentHourSnapshot();
            case "menu-analytics"          -> menuScheduler.computeYesterdaySnapshot();
            case "menu-analytics-intraday" -> menuScheduler.computeTodayPartialSnapshot();
            case "coupon-analytics"        -> couponScheduler.computeYesterdaySnapshot();
            case "user-preferences"        -> userPrefScheduler.rebuildAllUserSnapshots();
            case "co-occurrence"           -> coOccurrenceScheduler.run();
            default -> throw new IllegalArgumentException("No logic registered for job: " + jobId);
        }
    }

    private JobDefinition findDef(String id) {
        return jobDefinitions.stream().filter(d -> d.id().equals(id)).findFirst().orElse(null);
    }

    private void appendAudit(JobDefinition def, String status, Instant triggeredAt,
                             long durationMs, String triggeredBy, String notes) {
        String entryId = UUID.randomUUID().toString();
        AuditEntry entry = new AuditEntry(
                entryId, def.id(), def.name(), status,
                triggeredAt, Instant.now(), durationMs, triggeredBy, notes);
        auditLog.addFirst(entry);
        // Cap the log at AUDIT_MAX entries
        while (auditLog.size() > AUDIT_MAX) {
            auditLog.pollLast();
        }
    }

    private void evictCache(CacheManager manager, String cacheName) {
        var cache = manager.getCache(cacheName);
        if (cache != null) {
            cache.clear();
            log.debug("[SchedulerRegistry] Evicted cache '{}'", cacheName);
        }
    }

    private Map<String, Object> buildCacheInfo(CacheManager manager) {
        Collection<String> names = manager.getCacheNames();
        Map<String, Object> info = new LinkedHashMap<>();
        info.put("status", "UP");
        info.put("caches", names);
        info.put("count", names.size());
        return info;
    }
}

