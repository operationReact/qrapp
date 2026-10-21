package com.broandbro.qrapp.ops;

import com.broandbro.qrapp.entity.SchedulerJobSetting;
import com.broandbro.qrapp.repository.SchedulerJobSettingRepository;
import com.broandbro.qrapp.time.BusinessTime;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Tracks which scheduled jobs are paused. Pause state is persisted in {@code scheduler_job_settings}
 * and cached in memory, so cron checks do not hit the database.
 *
 * <p>Pausing only affects automatic (cron/fixed-delay) executions. Admin-triggered runs always execute.</p>
 */
@Component
public class SchedulerJobControl {

    private final SchedulerJobSettingRepository settingRepo;
    private final Set<String> pausedJobs = ConcurrentHashMap.newKeySet();

    public SchedulerJobControl(SchedulerJobSettingRepository settingRepo) {
        this.settingRepo = settingRepo;
    }

    @PostConstruct
    void loadSettings() {
        pausedJobs.clear();
        for (SchedulerJobSetting setting : settingRepo.findAll()) {
            if (setting.isPaused()) {
                pausedJobs.add(setting.getJobId());
            }
        }
    }

    public boolean isPaused(String jobId) {
        return pausedJobs.contains(jobId);
    }

    @Transactional
    public void setPaused(String jobId, boolean paused, String updatedBy) {
        SchedulerJobSetting setting = settingRepo.findById(jobId).orElseGet(() -> {
            SchedulerJobSetting created = new SchedulerJobSetting();
            created.setJobId(jobId);
            return created;
        });
        setting.setPaused(paused);
        setting.setUpdatedAt(BusinessTime.now());
        setting.setUpdatedBy(updatedBy);
        settingRepo.save(setting);
        if (paused) {
            pausedJobs.add(jobId);
        } else {
            pausedJobs.remove(jobId);
        }
    }
}
