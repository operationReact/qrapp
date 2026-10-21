package com.broandbro.qrapp.ops;

import com.broandbro.qrapp.entity.SchedulerJobRun;
import com.broandbro.qrapp.repository.SchedulerJobRunRepository;
import com.broandbro.qrapp.time.BusinessTime;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Persists one {@link SchedulerJobRun} row per job execution.
 *
 * <p>Each row is written in its own transaction, so a run's status survives even when
 * the job itself is wrapped in a transaction that rolls back. Nested calls are not recorded
 * separately: if a scheduled method runs inside an already-tracked run (for example a manual
 * trigger or a sync that calls a scheduler), only the outermost run gets a row.</p>
 */
@Slf4j
@Component
public class SchedulerRunRecorder {

    private static final int MAX_ERROR_LENGTH = 1000;
    private static final ThreadLocal<Boolean> ACTIVE = new ThreadLocal<>();

    private final SchedulerJobRunRepository runRepo;
    private final SchedulerJobControl control;
    private final TransactionTemplate requiresNewTx;

    public SchedulerRunRecorder(SchedulerJobRunRepository runRepo,
                                SchedulerJobControl control,
                                PlatformTransactionManager transactionManager) {
        this.runRepo = runRepo;
        this.control = control;
        this.requiresNewTx = new TransactionTemplate(transactionManager);
        this.requiresNewTx.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    public void runScheduled(String jobId, Runnable body) {
        track(jobId, SchedulerJobRun.TRIGGER_SCHEDULED, "scheduler", body);
    }

    public void runManual(String jobId, String triggeredBy, Runnable body) {
        track(jobId, SchedulerJobRun.TRIGGER_MANUAL, triggeredBy, body);
    }

    private void track(String jobId, String triggerType, String triggeredBy, Runnable body) {
        if (Boolean.TRUE.equals(ACTIVE.get())) {
            body.run();
            return;
        }

        SchedulerJobRun run = new SchedulerJobRun();
        run.setJobId(jobId);
        run.setTriggerType(triggerType);
        run.setTriggeredBy(triggeredBy);
        run.setStartedAt(BusinessTime.now());

        if (SchedulerJobRun.TRIGGER_SCHEDULED.equals(triggerType) && control.isPaused(jobId)) {
            run.setStatus(SchedulerJobRun.STATUS_SKIPPED);
            run.setFinishedAt(run.getStartedAt());
            run.setDurationMs(0L);
            save(run);
            return;
        }

        run.setStatus(SchedulerJobRun.STATUS_RUNNING);
        run = save(run);

        long startNanos = System.nanoTime();
        ACTIVE.set(Boolean.TRUE);
        try {
            body.run();
            finish(run, SchedulerJobRun.STATUS_SUCCESS, startNanos, null);
        } catch (Throwable ex) {
            finish(run, SchedulerJobRun.STATUS_FAILED, startNanos, ex.getMessage());
            throw ex;
        } finally {
            ACTIVE.remove();
        }
    }

    private void finish(SchedulerJobRun run, String status, long startNanos, String error) {
        run.setStatus(status);
        run.setFinishedAt(BusinessTime.now());
        run.setDurationMs((System.nanoTime() - startNanos) / 1_000_000);
        run.setErrorMessage(truncate(error));
        try {
            save(run);
        } catch (RuntimeException ex) {
            log.error("[SchedulerRunRecorder] Could not save final state for job '{}' run {}: {}",
                    run.getJobId(), run.getId(), ex.getMessage(), ex);
        }
    }

    private SchedulerJobRun save(SchedulerJobRun run) {
        return requiresNewTx.execute(status -> runRepo.save(run));
    }

    private static String truncate(String message) {
        if (message == null) return null;
        return message.length() <= MAX_ERROR_LENGTH ? message : message.substring(0, MAX_ERROR_LENGTH);
    }
}
