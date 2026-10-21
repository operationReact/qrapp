CREATE TABLE scheduler_job_settings (
    job_id      VARCHAR(64)  PRIMARY KEY,
    paused      BOOLEAN      NOT NULL DEFAULT FALSE,
    updated_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_by  VARCHAR(120)
);
