package com.broandbro.qrapp.ops;

import com.broandbro.qrapp.repository.SchedulerJobRunRepository;
import com.broandbro.qrapp.time.BusinessTime;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/** Deletes scheduler run history older than the retention window. */
@Slf4j
@Component
public class SchedulerRunRetention {

    private final SchedulerJobRunRepository runRepo;
    private final SchedulerRunRecorder recorder;
    private final int retentionDays;

    public SchedulerRunRetention(SchedulerJobRunRepository runRepo,
                                 SchedulerRunRecorder recorder,
                                 @Value("${scheduler.run-history.retention-days:30}") int retentionDays) {
        this.runRepo = runRepo;
        this.recorder = recorder;
        this.retentionDays = retentionDays;
    }

    @Scheduled(cron = "${scheduler.run-history.cron:0 30 3 * * *}", zone = "Asia/Kolkata")
    public void scheduledCleanup() {
        recorder.runScheduled(SchedulerJobIds.RUN_HISTORY_CLEANUP, this::purge);
    }

    /** Removes runs older than the retention window and returns how many rows were deleted. */
    public int purge() {
        LocalDateTime cutoff = BusinessTime.now().minusDays(retentionDays);
        int deleted = runRepo.deleteStartedBefore(cutoff);
        log.info("[SchedulerRunRetention] Deleted {} scheduler runs started before {}", deleted, cutoff);
        return deleted;
    }
}
