import { apiClient } from "./index";

// ── Jobs ──────────────────────────────────────────────────────────────────

/** Fetch all registered scheduler jobs with their current execution state. */
export const fetchOpsJobs = () =>
  apiClient.get("/api/admin/ops/jobs").then((r) => r.data);

/** Fetch the current state of a single job. */
export const fetchOpsJob = (jobId) =>
  apiClient.get(`/api/admin/ops/jobs/${jobId}`).then((r) => r.data);

/** Manually trigger a job. Returns 202 Accepted; poll the job to check completion. */
export const triggerOpsJob = (jobId) =>
  apiClient.post(`/api/admin/ops/jobs/${jobId}/trigger`).then((r) => r.data);

/** Fetch the execution audit log (newest first). */
export const fetchOpsHistory = () =>
  apiClient.get("/api/admin/ops/jobs/history").then((r) => r.data);

// ── Sync ──────────────────────────────────────────────────────────────────

/**
 * Trigger a named data-sync operation.
 * Valid types: menu | inventory | analytics | recommendations | promotions
 */
export const triggerSync = (type) =>
  apiClient.post(`/api/admin/ops/sync/${type}`).then((r) => r.data);

// ── Health ────────────────────────────────────────────────────────────────

/** Fetch the system health snapshot. */
export const fetchOpsHealth = () =>
  apiClient.get("/api/admin/ops/health").then((r) => r.data);

