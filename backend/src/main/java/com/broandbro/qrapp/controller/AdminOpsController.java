package com.broandbro.qrapp.controller;

import com.broandbro.qrapp.ops.SchedulerRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Operations Console REST API — exposes scheduler management, data sync,
 * and system health endpoints for the Admin Operations Center.
 *
 * <pre>
 *   GET  /api/admin/ops/jobs              — list all jobs + current state
 *   GET  /api/admin/ops/jobs/{id}         — single job state
 *   POST /api/admin/ops/jobs/{id}/trigger — manually trigger a job
 *   POST /api/admin/ops/jobs/{id}/pause   — pause automatic runs (manual triggers still work)
 *   POST /api/admin/ops/jobs/{id}/resume  — resume automatic runs
 *   GET  /api/admin/ops/runs              — persisted run history (paged, filterable)
 *   POST /api/admin/ops/sync/{type}       — trigger a data sync operation
 *   GET  /api/admin/ops/health            — system health snapshot
 * </pre>
 */
@RestController
@RequestMapping("/api/admin/ops")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("hasRole('ADMIN')")
public class AdminOpsController {

    private final SchedulerRegistry registry;

    // ── Jobs ───────────────────────────────────────────────────────────────────

    /**
     * GET /api/admin/ops/jobs
     * Returns all registered jobs with their current execution state.
     */
    @GetMapping("/jobs")
    public ResponseEntity<Map<String, Object>> listJobs() {
        List<SchedulerRegistry.JobSummary> jobs = registry.getAllJobs();
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("jobs", jobs);
        response.put("count", jobs.size());
        response.put("timestamp", Instant.now().toString());
        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/admin/ops/jobs/{id}
     * Returns the current state of a single job.
     */
    @GetMapping("/jobs/{id}")
    public ResponseEntity<?> getJob(@PathVariable String id) {
        SchedulerRegistry.JobSummary job = registry.getJob(id);
        if (job == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(job);
    }

    /**
     * POST /api/admin/ops/jobs/{id}/trigger
     * Manually triggers a background job. Returns 202 Accepted immediately;
     * the job executes asynchronously. Poll GET /jobs/{id} to check completion.
     */
    @PostMapping("/jobs/{id}/trigger")
    public ResponseEntity<?> triggerJob(@PathVariable String id, Authentication auth) {
        String triggeredBy = auth != null ? auth.getName() : "admin";
        try {
            SchedulerRegistry.TriggerResult result = registry.triggerJob(id, triggeredBy);
            Map<String, Object> response = new LinkedHashMap<>();
            response.put("jobId", result.jobId());
            response.put("status", result.status());
            response.put("triggeredAt", result.triggeredAt().toString());
            response.put("triggeredBy", triggeredBy);
            response.put("message", result.message());
            return ResponseEntity.accepted().body(response);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(
                    Map.of("error", ex.getMessage(), "jobId", id));
        } catch (IllegalStateException ex) {
            // 409 Conflict — job already running
            return ResponseEntity.status(409).body(
                    Map.of("error", ex.getMessage(), "jobId", id, "status", "RUNNING"));
        }
    }

    /**
     * POST /api/admin/ops/jobs/{id}/pause
     * Stops automatic runs of a scheduled job. Manual triggers still work. Returns the updated job.
     */
    @PostMapping("/jobs/{id}/pause")
    public ResponseEntity<?> pauseJob(@PathVariable String id, Authentication auth) {
        return setPaused(id, true, auth);
    }

    /**
     * POST /api/admin/ops/jobs/{id}/resume
     * Re-enables automatic runs of a paused job. Returns the updated job.
     */
    @PostMapping("/jobs/{id}/resume")
    public ResponseEntity<?> resumeJob(@PathVariable String id, Authentication auth) {
        return setPaused(id, false, auth);
    }

    private ResponseEntity<?> setPaused(String id, boolean paused, Authentication auth) {
        String actor = auth != null ? auth.getName() : "admin";
        try {
            return ResponseEntity.ok(registry.setJobPaused(id, paused, actor));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage(), "jobId", id));
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(409).body(Map.of("error", ex.getMessage(), "jobId", id));
        }
    }

    /**
     * GET /api/admin/ops/runs
     * Returns persisted scheduler runs (newest first), filterable by job and status
     * (RUNNING, SUCCESS, FAILED, SKIPPED).
     */
    @GetMapping("/runs")
    public ResponseEntity<Map<String, Object>> listRuns(
            @RequestParam(required = false) String jobId,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<SchedulerRegistry.RunView> runs = registry.searchRuns(jobId, status, page, size);
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("runs", runs.getContent());
        response.put("page", runs.getNumber());
        response.put("size", runs.getSize());
        response.put("totalPages", runs.getTotalPages());
        response.put("totalElements", runs.getTotalElements());
        response.put("timestamp", Instant.now().toString());
        return ResponseEntity.ok(response);
    }

    // ── Sync ───────────────────────────────────────────────────────────────────

    /**
     * POST /api/admin/ops/sync/{type}
     * Executes a named data-sync operation synchronously.
     *
     * <p>Valid types: {@code menu}, {@code inventory}, {@code analytics},
     * {@code recommendations}, {@code promotions}.</p>
     */
    @PostMapping("/sync/{type}")
    public ResponseEntity<?> runSync(@PathVariable String type, Authentication auth) {
        String triggeredBy = auth != null ? auth.getName() : "admin";
        try {
            SchedulerRegistry.SyncResult result = registry.runSync(type, triggeredBy);
            return ResponseEntity.ok(Map.of(
                    "type",        result.type(),
                    "message",     result.message(),
                    "completedAt", result.completedAt().toString()
            ));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(
                    Map.of("error", ex.getMessage()));
        } catch (Exception ex) {
            log.error("[AdminOpsController] Sync '{}' failed: {}", type, ex.getMessage(), ex);
            return ResponseEntity.internalServerError().body(
                    Map.of("error", "Sync failed: " + ex.getMessage(), "type", type));
        }
    }

    // ── Health ─────────────────────────────────────────────────────────────────

    /**
     * GET /api/admin/ops/health
     * Returns a lightweight system health snapshot (no DB ping — uses live state).
     */
    @GetMapping("/health")
    public ResponseEntity<SchedulerRegistry.HealthStatus> getHealth() {
        return ResponseEntity.ok(registry.getHealth());
    }
}

