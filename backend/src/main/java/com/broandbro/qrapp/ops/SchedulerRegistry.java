package com.broandbro.qrapp.ops;

import com.broandbro.qrapp.analytics.config.AnalyticsCacheConfig;
import com.broandbro.qrapp.analytics.scheduler.*;
import com.broandbro.qrapp.entity.SchedulerJobRun;
import com.broandbro.qrapp.recommendation.scheduler.CoOccurrenceScheduler;
import com.broandbro.qrapp.repository.SchedulerJobRunRepository;
import com.broandbro.qrapp.service.RefundService;
import com.broandbro.qrapp.time.BusinessTime;
import com.broandbro.qrapp.whatsapp.WhatsAppWebhookProcessor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.cache.CacheManager;
import org.springframework.core.env.Environment;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Page;
import org.springframework.scheduling.support.CronExpression;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZonedDateTime;
import java.util.*;
import java.util.concurrent.*;

/**
 * Central registry for background scheduler jobs.
 *
 * <p>Run history is persisted by {@link SchedulerRunRecorder} into
 * {@code scheduler_job_runs}, so both cron and manual runs survive restarts.
 * This class exposes job definitions, derived status, manual triggers and
 * sync operations for the Operations Console.</p>
 */
@Service
@Slf4j
public class SchedulerRegistry {

    // ── Inner types ────────────────────────────────────────────────────────────

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
            String lastError,
            boolean scheduled,
            boolean paused,
            Instant nextRunAt) {}

    public record RunView(
            Long id,
            String jobId,
            String jobName,
            String triggerType,
            String status,
            Instant startedAt,
            Instant finishedAt,
            long durationMs,
            String triggeredBy,
            String errorMessage) {}

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

    /** A RUNNING row older than this is treated as orphaned (e.g. the process died mid-run). */
    private static final Duration STALE_RUN_AFTER = Duration.ofHours(2);
    private static final String STALE_RUN_ERROR =
            "Run never finished (the process restarted or stopped mid-run)";
    private static final int MAX_PAGE_SIZE = 100;

    /** Cron property and fallback for each cron-driven job. Fallbacks mirror application.yml. */
    private record CronSource(String property, String fallback) {}

    private static final Map<String, CronSource> CRON_SOURCES = Map.of(
            SchedulerJobIds.DAILY_SALES, new CronSource("analytics.cron.daily-sales", "0 5 0 * * *"),
            SchedulerJobIds.DAILY_SALES_INTRADAY, new CronSource("analytics.cron.daily-sales-intraday", "0 0 12 * * *"),
            SchedulerJobIds.HOURLY_ANALYTICS, new CronSource("analytics.cron.hourly-orders", "0 2 * * * *"),
            SchedulerJobIds.MENU_ANALYTICS, new CronSource("analytics.cron.menu-items", "0 10 0 * * *"),
            SchedulerJobIds.MENU_ANALYTICS_INTRADAY, new CronSource("analytics.cron.menu-items-intraday", "0 30 12 * * *"),
            SchedulerJobIds.COUPON_ANALYTICS_INTRADAY, new CronSource("analytics.cron.coupon-analytics-intraday", "0 0 */6 * * *"),
            SchedulerJobIds.USER_PREFERENCES, new CronSource("analytics.cron.user-preferences", "0 0 1 * * *"),
            SchedulerJobIds.CO_OCCURRENCE, new CronSource("recommendation.cron.co-occurrence", "0 30 1 * * *"),
            SchedulerJobIds.RUN_HISTORY_CLEANUP, new CronSource("scheduler.run-history.cron", "0 30 3 * * *"));

    /** Jobs that only run when an admin triggers them (no automatic schedule). */
    private static final Set<String> MANUAL_ONLY = Set.of(SchedulerJobIds.COUPON_ANALYTICS);

    // ── Dependencies ───────────────────────────────────────────────────────────

    private final DailySalesAggregationScheduler dailySalesScheduler;
    private final HourlyAnalyticsScheduler hourlyScheduler;
    private final MenuAnalyticsScheduler menuScheduler;
    private final CouponAnalyticsScheduler couponScheduler;
    private final UserPreferenceScheduler userPrefScheduler;
    private final CoOccurrenceScheduler coOccurrenceScheduler;
    private final RefundService refundService;
    private final WhatsAppWebhookProcessor whatsAppProcessor;
    private final SchedulerRunRetention runRetention;
    private final SchedulerRunRecorder runRecorder;
    private final SchedulerJobRunRepository runRepo;
    private final SchedulerJobControl jobControl;
    private final Environment environment;
    private final CacheManager analyticsCacheManager;
    private final CacheManager cacheManager;

    public SchedulerRegistry(
            DailySalesAggregationScheduler dailySalesScheduler,
            HourlyAnalyticsScheduler hourlyScheduler,
            MenuAnalyticsScheduler menuScheduler,
            CouponAnalyticsScheduler couponScheduler,
            UserPreferenceScheduler userPrefScheduler,
            CoOccurrenceScheduler coOccurrenceScheduler,
            RefundService refundService,
            WhatsAppWebhookProcessor whatsAppProcessor,
            SchedulerRunRetention runRetention,
            SchedulerRunRecorder runRecorder,
            SchedulerJobRunRepository runRepo,
            SchedulerJobControl jobControl,
            Environment environment,
            @Qualifier("analyticsCacheManager") CacheManager analyticsCacheManager,
            CacheManager cacheManager) {
        this.dailySalesScheduler = dailySalesScheduler;
        this.hourlyScheduler = hourlyScheduler;
        this.menuScheduler = menuScheduler;
        this.couponScheduler = couponScheduler;
        this.userPrefScheduler = userPrefScheduler;
        this.coOccurrenceScheduler = coOccurrenceScheduler;
        this.refundService = refundService;
        this.whatsAppProcessor = whatsAppProcessor;
        this.runRetention = runRetention;
        this.runRecorder = runRecorder;
        this.runRepo = runRepo;
        this.jobControl = jobControl;
        this.environment = environment;
        this.analyticsCacheManager = analyticsCacheManager;
        this.cacheManager = cacheManager;
    }

    // ── Job definitions ────────────────────────────────────────────────────────

    private final List<JobDefinition> jobDefinitions = List.of(
            new JobDefinition(
                    SchedulerJobIds.DAILY_SALES,
                    "Daily Sales Snapshot",
                    "Aggregates the previous day's orders into the daily sales analytics table. Safe to re-run — uses upsert logic.",
                    "Analytics",
                    "Daily at 00:05 IST"),
            new JobDefinition(
                    SchedulerJobIds.DAILY_SALES_INTRADAY,
                    "Intraday Sales Refresh",
                    "Refreshes today's partial sales data to keep dashboards current. Runs automatically at noon.",
                    "Analytics",
                    "Daily at 12:00 IST"),
            new JobDefinition(
                    SchedulerJobIds.HOURLY_ANALYTICS,
                    "Hourly Order Analytics",
                    "Materialises order counts and fulfilment stats for the most recently completed hour.",
                    "Analytics",
                    "Hourly at :02"),
            new JobDefinition(
                    SchedulerJobIds.MENU_ANALYTICS,
                    "Menu Item Analytics",
                    "Computes per-item sales ranks, revenue contribution, and category-level rollups for yesterday.",
                    "Analytics",
                    "Daily at 00:10 IST"),
            new JobDefinition(
                    SchedulerJobIds.MENU_ANALYTICS_INTRADAY,
                    "Menu Analytics Intraday",
                    "Refreshes today's menu item performance snapshot. Keeps the top-sellers widget current.",
                    "Analytics",
                    "Daily at 12:30 IST"),
            new JobDefinition(
                    SchedulerJobIds.COUPON_ANALYTICS_INTRADAY,
                    "Coupon Analytics Intraday",
                    "Refreshes today's partial coupon usage and discount cost snapshot.",
                    "Analytics",
                    "Every 6 hours"),
            new JobDefinition(
                    SchedulerJobIds.COUPON_ANALYTICS,
                    "Coupon Performance Analytics",
                    "Computes coupon usage rates, conversion, discount cost ratios, and abuse signals for yesterday.",
                    "Analytics",
                    "Manual only (nightly schedule is disabled)"),
            new JobDefinition(
                    SchedulerJobIds.USER_PREFERENCES,
                    "User Preference Rebuild",
                    "Full rebuild of user segmentation, churn flags, RFM scores, and preference data for all users.",
                    "Analytics",
                    "Daily at 01:00 IST",
                    "This job processes all users and may take several minutes on large datasets."),
            new JobDefinition(
                    SchedulerJobIds.CO_OCCURRENCE,
                    "Recommendation Engine",
                    "Mines 90-day co-purchase patterns to refresh recommendation candidates. Runs nightly.",
                    "Recommendations",
                    "Daily at 01:30 IST",
                    "This job scans 90 days of order history and may take a few minutes."),
            new JobDefinition(
                    SchedulerJobIds.REFUND_SWEEP,
                    "Refund Sweep",
                    "Processes refunds that are due (retries and timeline checks). Only recorded when there is work to do.",
                    "Payments",
                    "Every 60 seconds",
                    "Pausing this stops automatic refund retries. Refunds stay pending until it is resumed or an admin retries them."),
            new JobDefinition(
                    SchedulerJobIds.WHATSAPP_OUTBOX,
                    "WhatsApp Outbox",
                    "Delivers queued WhatsApp webhook events. Automatic polls are not recorded (one per second); manual runs are.",
                    "Messaging",
                    "Every 1 second"),
            new JobDefinition(
                    SchedulerJobIds.RUN_HISTORY_CLEANUP,
                    "Activity History Cleanup",
                    "Deletes activity records older than 30 days so the history stays small.",
                    "System",
                    "Daily at 03:30 IST")
    );

    private final Set<String> manualJobsInFlight = ConcurrentHashMap.newKeySet();

    private final ExecutorService jobExecutor = Executors.newFixedThreadPool(
            3, r -> {
                Thread t = new Thread(r, "ops-job-executor");
                t.setDaemon(true);
                return t;
            });

    // ── Public API ─────────────────────────────────────────────────────────────

    /** Returns all job summaries (definitions merged with the latest persisted runs). */
    public List<JobSummary> getAllJobs() {
        return jobDefinitions.stream().map(this::summarize).toList();
    }

    /** Returns the summary for a single job, or null if the job is unknown. */
    public JobSummary getJob(String jobId) {
        JobDefinition def = findDef(jobId);
        return def == null ? null : summarize(def);
    }

    /**
     * Pauses or resumes automatic execution of a scheduled job. Manual triggers still run while paused.
     *
     * @throws IllegalArgumentException if the job ID is unknown
     * @throws IllegalStateException    if the job has no automatic schedule
     */
    public JobSummary setJobPaused(String jobId, boolean paused, String updatedBy) {
        JobDefinition def = findDef(jobId);
        if (def == null) {
            throw new IllegalArgumentException("Unknown job: " + jobId);
        }
        if (MANUAL_ONLY.contains(jobId)) {
            throw new IllegalStateException("Job '" + def.name() + "' runs only when triggered manually");
        }
        String byLabel = (updatedBy != null && !updatedBy.isBlank()) ? updatedBy : "admin";
        jobControl.setPaused(jobId, paused, byLabel);
        log.info("[SchedulerRegistry] Job '{}' {} by '{}'", jobId, paused ? "paused" : "resumed", byLabel);
        return summarize(def);
    }

    /**
     * Triggers a job asynchronously. The run is persisted as a MANUAL run.
     *
     * @throws IllegalArgumentException if the job ID is unknown
     * @throws IllegalStateException    if the job is already running
     */
    public TriggerResult triggerJob(String jobId, String triggeredBy) {
        JobDefinition def = findDef(jobId);
        if (def == null) {
            throw new IllegalArgumentException("Unknown job: " + jobId);
        }
        if (isRunning(jobId) || !manualJobsInFlight.add(jobId)) {
            throw new IllegalStateException("Job '" + def.name() + "' is already running");
        }

        Instant triggeredAt = Instant.now();
        String byLabel = (triggeredBy != null && !triggeredBy.isBlank()) ? triggeredBy : "admin";
        log.info("[SchedulerRegistry] Job '{}' manually triggered by '{}'", jobId, byLabel);

        try {
            jobExecutor.submit(() -> {
                try {
                    runRecorder.runManual(jobId, byLabel, () -> runJobLogic(jobId));
                } catch (RuntimeException ex) {
                    log.error("[SchedulerRegistry] Manual job '{}' failed: {}", jobId, ex.getMessage(), ex);
                } finally {
                    manualJobsInFlight.remove(jobId);
                }
            });
        } catch (RejectedExecutionException ex) {
            manualJobsInFlight.remove(jobId);
            throw ex;
        }

        return new TriggerResult(jobId, "RUNNING", triggeredAt, "Task '" + def.name() + "' started");
    }

    /**
     * Returns persisted runs, newest first.
     *
     * @param jobId  optional job filter
     * @param status optional status filter (RUNNING, SUCCESS, FAILED)
     */
    public Page<RunView> searchRuns(String jobId, String status, int page, int size) {
        String jobFilter = blankToNull(jobId);
        String statusFilter = blankToNull(status) == null ? null : status.trim().toUpperCase(Locale.ROOT);
        PageRequest pageRequest = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), MAX_PAGE_SIZE));
        return runRepo.search(jobFilter, statusFilter, pageRequest)
                .map(run -> toView(run, findDef(run.getJobId())));
    }

    /**
     * Executes a named sync operation synchronously.
     *
     * <p>Sync operations are lightweight cache-eviction and intraday-refresh
     * actions — they are safe to run at any time without disrupting live traffic.</p>
     */
    public SyncResult runSync(String type, String triggeredBy) {
        log.info("[SchedulerRegistry] Sync '{}' triggered by '{}'", type, triggeredBy);
        String by = (triggeredBy != null && !triggeredBy.isBlank()) ? triggeredBy : "admin";
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
                runRecorder.runManual(SchedulerJobIds.DAILY_SALES_INTRADAY, by, dailySalesScheduler::computeTodayPartialSnapshot);
                runRecorder.runManual(SchedulerJobIds.HOURLY_ANALYTICS, by, hourlyScheduler::computeCurrentHourSnapshot);
                runRecorder.runManual(SchedulerJobIds.MENU_ANALYTICS_INTRADAY, by, menuScheduler::computeTodayPartialSnapshot);
                runRecorder.runManual(SchedulerJobIds.COUPON_ANALYTICS_INTRADAY, by, couponScheduler::computeTodayPartialSnapshot);
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

        Map<String, Long> counts = new HashMap<>();
        for (JobSummary job : getAllJobs()) {
            counts.merge(job.status(), 1L, Long::sum);
        }
        Map<String, Object> schedulerInfo = new LinkedHashMap<>();
        schedulerInfo.put("total", jobDefinitions.size());
        schedulerInfo.put("idle", counts.getOrDefault("IDLE", 0L));
        schedulerInfo.put("running", counts.getOrDefault("RUNNING", 0L));
        schedulerInfo.put("success", counts.getOrDefault("SUCCESS", 0L));
        schedulerInfo.put("failed", counts.getOrDefault("FAILED", 0L));

        return new HealthStatus(app, Map.of("status", "UP"), mainCacheInfo, analyticsCacheInfo, schedulerInfo, Instant.now());
    }

    // ── Private helpers ────────────────────────────────────────────────────────

    private void runJobLogic(String jobId) {
        switch (jobId) {
            case SchedulerJobIds.DAILY_SALES              -> dailySalesScheduler.computeYesterdaySnapshot();
            case SchedulerJobIds.DAILY_SALES_INTRADAY     -> dailySalesScheduler.computeTodayPartialSnapshot();
            case SchedulerJobIds.HOURLY_ANALYTICS         -> hourlyScheduler.computeCurrentHourSnapshot();
            case SchedulerJobIds.MENU_ANALYTICS           -> menuScheduler.computeYesterdaySnapshot();
            case SchedulerJobIds.MENU_ANALYTICS_INTRADAY  -> menuScheduler.computeTodayPartialSnapshot();
            case SchedulerJobIds.COUPON_ANALYTICS         -> couponScheduler.computeYesterdaySnapshot();
            case SchedulerJobIds.COUPON_ANALYTICS_INTRADAY -> couponScheduler.computeTodayPartialSnapshot();
            case SchedulerJobIds.USER_PREFERENCES         -> userPrefScheduler.rebuildAllUserSnapshots();
            case SchedulerJobIds.CO_OCCURRENCE            -> coOccurrenceScheduler.run();
            case SchedulerJobIds.REFUND_SWEEP             -> refundService.sweepDueRefunds();
            case SchedulerJobIds.WHATSAPP_OUTBOX          -> whatsAppProcessor.processPending();
            case SchedulerJobIds.RUN_HISTORY_CLEANUP      -> runRetention.purge();
            default -> throw new IllegalArgumentException("No logic registered for job: " + jobId);
        }
    }

    private JobSummary summarize(JobDefinition def) {
        Optional<SchedulerJobRun> last = runRepo.findFirstByJobIdOrderByStartedAtDesc(def.id());
        Optional<SchedulerJobRun> lastSuccess =
                runRepo.findFirstByJobIdAndStatusOrderByStartedAtDesc(def.id(), SchedulerJobRun.STATUS_SUCCESS);
        Optional<SchedulerJobRun> lastFailed =
                runRepo.findFirstByJobIdAndStatusOrderByStartedAtDesc(def.id(), SchedulerJobRun.STATUS_FAILED);

        boolean paused = jobControl.isPaused(def.id());
        String status;
        if (isRunning(def.id())) {
            status = SchedulerJobRun.STATUS_RUNNING;
        } else if (paused) {
            status = "PAUSED";
        } else {
            status = last.map(this::effectiveStatus).orElse("IDLE");
        }

        return new JobSummary(
                def.id(), def.name(), def.description(), def.category(),
                def.schedule(), def.warningMessage(),
                status,
                last.map(r -> toInstant(r.getStartedAt())).orElse(null),
                lastSuccess.map(r -> toInstant(r.getStartedAt())).orElse(null),
                lastFailed.map(r -> toInstant(r.getStartedAt())).orElse(null),
                last.map(r -> r.getDurationMs() == null ? 0L : r.getDurationMs()).orElse(0L),
                last.filter(r -> SchedulerJobRun.STATUS_FAILED.equals(r.getStatus()))
                        .map(SchedulerJobRun::getErrorMessage).orElse(null),
                !MANUAL_ONLY.contains(def.id()),
                paused,
                paused ? null : nextRunAt(def.id()));
    }

    /** Next cron fire time in IST, or null for fixed-delay and manual-only jobs. */
    private Instant nextRunAt(String jobId) {
        CronSource source = CRON_SOURCES.get(jobId);
        if (source == null) {
            return null;
        }
        String cron = environment.getProperty(source.property(), source.fallback());
        try {
            ZonedDateTime next = CronExpression.parse(cron).next(ZonedDateTime.now(BusinessTime.ZONE));
            return next == null ? null : next.toInstant();
        } catch (IllegalArgumentException ex) {
            log.warn("[SchedulerRegistry] Invalid cron '{}' for job '{}': {}", cron, jobId, ex.getMessage());
            return null;
        }
    }


    /** True while a manual run is in flight or a RUNNING row is recent enough to be genuine. */
    private boolean isRunning(String jobId) {
        if (manualJobsInFlight.contains(jobId)) {
            return true;
        }
        return runRepo.findFirstByJobIdOrderByStartedAtDesc(jobId)
                .filter(r -> SchedulerJobRun.STATUS_RUNNING.equals(r.getStatus()))
                .map(r -> toInstant(r.getStartedAt()).isAfter(Instant.now().minus(STALE_RUN_AFTER)))
                .orElse(false);
    }

    private RunView toView(SchedulerJobRun run, JobDefinition def) {
        return new RunView(
                run.getId(),
                run.getJobId(),
                def == null ? run.getJobId() : def.name(),
                run.getTriggerType(),
                effectiveStatus(run),
                toInstant(run.getStartedAt()),
                toInstant(run.getFinishedAt()),
                run.getDurationMs() == null ? 0L : run.getDurationMs(),
                run.getTriggeredBy(),
                isStaleRun(run) ? STALE_RUN_ERROR : run.getErrorMessage());
    }

    /** A RUNNING row past {@link #STALE_RUN_AFTER} never finished; report it as FAILED instead of RUNNING forever. */
    private boolean isStaleRun(SchedulerJobRun run) {
        return SchedulerJobRun.STATUS_RUNNING.equals(run.getStatus())
                && toInstant(run.getStartedAt()).isBefore(Instant.now().minus(STALE_RUN_AFTER));
    }

    private String effectiveStatus(SchedulerJobRun run) {
        return isStaleRun(run) ? SchedulerJobRun.STATUS_FAILED : run.getStatus();
    }

    private static Instant toInstant(LocalDateTime value) {
        return value == null ? null : value.atZone(BusinessTime.ZONE).toInstant();
    }

    private static String blankToNull(String value) {
        return (value == null || value.isBlank()) ? null : value.trim();
    }

    private JobDefinition findDef(String id) {
        return jobDefinitions.stream().filter(d -> d.id().equals(id)).findFirst().orElse(null);
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
