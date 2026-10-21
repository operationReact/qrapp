-- One row per execution of a background job, whether fired by cron or triggered by an admin.
CREATE TABLE scheduler_job_runs (
    id            BIGSERIAL    PRIMARY KEY,
    job_id        VARCHAR(64)  NOT NULL,
    trigger_type  VARCHAR(16)  NOT NULL,
    status        VARCHAR(16)  NOT NULL,
    started_at    TIMESTAMP    NOT NULL,
    finished_at   TIMESTAMP,
    duration_ms   BIGINT,
    triggered_by  VARCHAR(120),
    error_message TEXT
);

CREATE INDEX idx_scheduler_job_runs_started     ON scheduler_job_runs (started_at DESC);
CREATE INDEX idx_scheduler_job_runs_job_started ON scheduler_job_runs (job_id, started_at DESC);
