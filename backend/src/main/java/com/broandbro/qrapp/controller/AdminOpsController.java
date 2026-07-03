package com.broandbro.qrapp.controller;

import com.broandbro.qrapp.ops.SchedulerRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
 *   GET  /api/admin/ops/jobs/history      — execution audit log
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
     * GET /api/admin/ops/jobs/history
     * Returns the in-memory execution audit log (newest first, up to 200 entries).
     */
    @GetMapping("/jobs/history")
    public ResponseEntity<Map<String, Object>> getHistory() {
        List<SchedulerRegistry.AuditEntry> entries = registry.getAuditLog();
        return ResponseEntity.ok(Map.of(
                "entries", entries,
                "count",   entries.size(),
                "timestamp", Instant.now().toString()
        ));
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

