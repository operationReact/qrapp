package com.broandbro.qrapp.demodata;

import com.broandbro.qrapp.analytics.scheduler.DailySalesAggregationScheduler;
import com.broandbro.qrapp.time.BusinessTime;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.Executor;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Supplier;

@Slf4j
@RestController
@RequestMapping("/api/admin/demo-data")
@PreAuthorize("hasAnyRole('ADMIN', 'SUPERUSER', 'SUPER_ADMIN')")
public class DemoDataController {
    private final DemoDataService demoDataService;
    private final DailySalesAggregationScheduler dailySalesScheduler;
    private final Executor demoDataExecutor;
    private final AtomicReference<JobState> state = new AtomicReference<>(JobState.idle());

    public DemoDataController(
            DemoDataService demoDataService,
            DailySalesAggregationScheduler dailySalesScheduler,
            @Qualifier("demoDataExecutor") Executor demoDataExecutor) {
        this.demoDataService = demoDataService;
        this.dailySalesScheduler = dailySalesScheduler;
        this.demoDataExecutor = demoDataExecutor;
    }

    @PostMapping("/seed")
    public ResponseEntity<Map<String, Object>> seed() {
        return startJob("seed", () -> {
            Map<String, Object> result = demoDataService.setup();
            var today = BusinessTime.today();
            dailySalesScheduler.backfill(today.minusDays(89), today);
            return result;
        });
    }

    @PostMapping("/cleanup")
    public ResponseEntity<Map<String, Object>> cleanup() {
        return startJob("cleanup", demoDataService::cleanup);
    }

    private ResponseEntity<Map<String, Object>> startJob(String operation,
                                                           Supplier<Map<String, Object>> action) {
        JobState current = state.get();
        if (!current.status().equals("IDLE") && !current.status().equals("FAILED")
                && !current.status().equals("COMPLETED")) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(current.asResponse());
        }

        JobState started = JobState.running(operation);
        state.set(started);
        demoDataExecutor.execute(() -> {
            try {
                Map<String, Object> result = action.get();
                state.set(JobState.completed(operation, result));
                log.info("Demo data {} completed: {}", operation, result);
            } catch (Exception ex) {
                state.set(JobState.failed(operation, ex.getMessage()));
                log.error("Demo data {} failed", operation, ex);
            }
        });
        return ResponseEntity.accepted().body(started.asResponse());
    }

    @GetMapping("/seed/status")
    public Map<String, Object> status() {
        return state.get().asResponse();
    }

    private record JobState(String status, String operation, Instant startedAt, Instant completedAt,
                            String error, Map<String, Object> result) {
        static JobState idle() {
            return new JobState("IDLE", "", null, null, null, null);
        }

        static JobState running(String operation) {
            return new JobState("RUNNING", operation, Instant.now(), null, null, null);
        }

        static JobState completed(String operation, Map<String, Object> result) {
            return new JobState("COMPLETED", operation, null, Instant.now(), null, result);
        }

        static JobState failed(String operation, String error) {
            return new JobState("FAILED", operation, null, Instant.now(), error, null);
        }

        Map<String, Object> asResponse() {
            return Map.ofEntries(
                    Map.entry("status", status),
                    Map.entry("operation", operation),
                    startedAt == null ? Map.entry("startedAt", "") : Map.entry("startedAt", startedAt.toString()),
                    completedAt == null ? Map.entry("completedAt", "") : Map.entry("completedAt", completedAt.toString()),
                    Map.entry("error", error == null ? "" : error),
                    Map.entry("result", result == null ? Map.of() : result)
            );
        }
    }
}
