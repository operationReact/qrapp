package com.broandbro.qrapp.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/** Pause state for a scheduled background job. Missing row means the job is active. */
@Entity
@Table(name = "scheduler_job_settings")
@Data
@NoArgsConstructor
public class SchedulerJobSetting {

    @Id
    @Column(name = "job_id", length = 64)
    private String jobId;

    @Column(name = "paused", nullable = false)
    private boolean paused;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "updated_by", length = 120)
    private String updatedBy;
}
