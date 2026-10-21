import { createFileRoute, Link, Navigate, useLocation } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchOpsJobs,
  fetchSchedulerRuns,
  pauseOpsJob,
  resumeOpsJob,
  triggerOpsJob,
} from "@/services/opsService";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  ArrowLeftIcon,
  ArrowClockwiseIcon,
  CaretLeftIcon,
  CaretRightIcon,
  CheckCircleIcon,
  CircleNotchIcon,
  ClockCounterClockwiseIcon,
  PauseIcon,
  PlayIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";

export const Route = createFileRoute("/admin/background-tasks")({
  component: BackgroundTasksPage,
});

const PAGE_SIZE = 20;
const STATUS_OPTIONS = ["ALL", "SUCCESS", "FAILED", "RUNNING", "SKIPPED"];
const STATUS_LABELS = {
  ALL: "All results",
  SUCCESS: "Succeeded",
  FAILED: "Failed",
  RUNNING: "Running",
  PAUSED: "Paused",
  SKIPPED: "Skipped",
  IDLE: "Not run yet",
};
const LIVE_POLL_MS = 5_000;
const IDLE_POLL_MS = 30_000;

const IST_FORMAT = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

function formatDateTime(iso) {
  if (!iso) return "—";
  return `${IST_FORMAT.format(new Date(iso))} IST`;
}

function formatDuration(ms) {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`;
  return `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`;
}

function hasRunningJob(jobs) {
  return jobs.some((job) => job.status === "RUNNING");
}

function StatusPill({ status }) {
  const tone =
    status === "SUCCESS" ? "srs-pill--success"
    : status === "FAILED" ? "srs-pill--failed"
    : status === "RUNNING" ? "srs-pill--running"
    : status === "PAUSED" ? "srs-pill--paused"
    : status === "SKIPPED" ? "srs-pill--skipped"
    : "srs-pill--idle";
  return <span className={`srs-pill ${tone}`}>{STATUS_LABELS[status] ?? status}</span>;
}

function SummaryStrip({ jobs }) {
  const items = [
    ["Tasks", jobs.length],
    ["Running now", jobs.filter((j) => j.status === "RUNNING").length],
    ["Paused", jobs.filter((j) => j.paused).length],
    ["Last run failed", jobs.filter((j) => j.status === "FAILED").length],
  ];
  return (
    <div className="srs-summary">
      {items.map(([label, value]) => (
        <div key={label} className="srs-stat">
          <span className="srs-stat-value">{value}</span>
          <span className="srs-stat-label">{label}</span>
        </div>
      ))}
    </div>
  );
}

function TaskCard({ job, onRun, onToggle, onViewHistory, toggling, runDisabled }) {
  const running = job.status === "RUNNING";
  let nextText;
  if (!job.scheduled) {
    nextText = "Only when started manually";
  } else if (job.paused) {
    nextText = "Paused — no automatic runs";
  } else if (job.nextRunAt) {
    nextText = `Next run: ${formatDateTime(job.nextRunAt)}`;
  } else {
    nextText = "Runs automatically";
  }

  return (
    <article className={`srs-job ${job.paused ? "srs-job--paused" : ""}`}>
      <div className="srs-job-head">
        <div className="min-w-0">
          <div className="srs-job-cat">{job.category}</div>
          <h3 className="srs-job-name">{job.name}</h3>
        </div>
        <StatusPill status={job.status} />
      </div>
      <p className="srs-job-desc">{job.description}</p>
      <div className="srs-job-meta">
        <span>When: {job.schedule}</span>
        <span className="srs-next">{nextText}</span>
        <span>Last run: {formatDateTime(job.lastRunAt)}</span>
        {job.lastSuccessAt && <span>Last success: {formatDateTime(job.lastSuccessAt)}</span>}
      </div>
      {job.lastError && (
        <div className="srs-job-error" title={job.lastError}>
          <WarningCircleIcon weight="fill" className="size-3.5" aria-hidden="true" />
          Last failure: {job.lastError}
        </div>
      )}
      {job.warningMessage && <div className="srs-job-note">{job.warningMessage}</div>}
      <div className="srs-job-actions">
        <button type="button" className="srs-btn" onClick={() => onViewHistory(job.id)}>
          <ClockCounterClockwiseIcon weight="bold" className="size-3.5" aria-hidden="true" />
          History
        </button>
        {job.scheduled && (
          <button type="button" className="srs-btn" onClick={() => onToggle(job)} disabled={toggling}>
            {job.paused
              ? <PlayIcon weight="fill" className="size-3.5" aria-hidden="true" />
              : <PauseIcon weight="fill" className="size-3.5" aria-hidden="true" />}
            {job.paused ? "Resume automatic runs" : "Pause automatic runs"}
          </button>
        )}
        <button
          type="button"
          className="srs-btn srs-btn--primary"
          onClick={() => onRun(job)}
          disabled={runDisabled || running}
        >
          {running
            ? <CircleNotchIcon className="size-3.5 animate-spin" aria-hidden="true" />
            : <PlayIcon weight="fill" className="size-3.5" aria-hidden="true" />}
          {running ? "Running…" : "Run now"}
        </button>
      </div>
    </article>
  );
}

function BackgroundTasksPage() {
  const { isAdmin, isSuperUser } = useAuth();
  const { pathname } = useLocation();
  const queryClient = useQueryClient();

  const [jobFilter, setJobFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(0);
  const [pendingJob, setPendingJob] = useState(null);

  const canView = !!(isAdmin || isSuperUser);

  const jobsQuery = useQuery({
    queryKey: ["ops", "jobs"],
    queryFn: fetchOpsJobs,
    staleTime: 5_000,
    refetchInterval: (query) => (hasRunningJob(query.state.data?.jobs ?? []) ? LIVE_POLL_MS : IDLE_POLL_MS),
    enabled: canView,
  });

  const jobs = jobsQuery.data?.jobs ?? [];
  const jobsRunning = hasRunningJob(jobs);

  const runsQuery = useQuery({
    queryKey: ["ops", "runs", jobFilter, statusFilter, page],
    queryFn: () => fetchSchedulerRuns({
      jobId: jobFilter,
      status: statusFilter === "ALL" ? "" : statusFilter,
      page,
      size: PAGE_SIZE,
    }),
    placeholderData: keepPreviousData,
    refetchInterval: jobsRunning ? LIVE_POLL_MS : IDLE_POLL_MS,
    enabled: canView,
  });

  const runMutation = useMutation({
    mutationFn: (jobId) => triggerOpsJob(jobId),
    onSuccess: (data) => {
      toast.success("Task started", { description: data?.message });
      queryClient.invalidateQueries({ queryKey: ["ops"] });
      setPendingJob(null);
    },
    onError: (error) => {
      const status = error?.response?.status;
      toast.error(status === 409 ? "Task is already running" : "Could not start task", {
        description: error?.response?.data?.error ?? "Please try again",
      });
      setPendingJob(null);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ job }) => (job.paused ? resumeOpsJob(job.id) : pauseOpsJob(job.id)),
    onSuccess: (_data, { job }) => {
      toast.success(job.paused ? "Automatic runs resumed" : "Automatic runs paused", { description: job.name });
      queryClient.invalidateQueries({ queryKey: ["ops"] });
    },
    onError: (error) => {
      toast.error("Could not update task", {
        description: error?.response?.data?.error ?? "Please try again",
      });
    },
  });

  if (!canView) {
    return <Navigate to="/login" replace state={{ from: pathname }} />;
  }

  const runs = runsQuery.data?.runs ?? [];
  const totalPages = runsQuery.data?.totalPages ?? 0;
  const totalElements = runsQuery.data?.totalElements ?? 0;

  const viewHistory = (jobId) => {
    setJobFilter(jobId);
    setPage(0);
    document.getElementById("srs-history")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="srs">
      <div className="srs-head">
        <div>
          <Link to="/admin/ops-center" className="srs-back">
            <ArrowLeftIcon weight="bold" className="size-3.5" aria-hidden="true" />
            Operations Center
          </Link>
          <h1 className="srs-title">Background Tasks</h1>
          <p className="srs-sub">
            Automatic tasks that keep sales reports, recommendations and refunds up to date.
            Pause automatic runs, start any task yourself, and review every run.
            Updates every few seconds while a task is running.
          </p>
        </div>
        <button
          type="button"
          className="srs-btn"
          onClick={() => queryClient.invalidateQueries({ queryKey: ["ops"] })}
        >
          <ArrowClockwiseIcon weight="bold" className="size-3.5" aria-hidden="true" />
          Refresh
        </button>
      </div>

      {!jobsQuery.isLoading && <SummaryStrip jobs={jobs} />}

      <section>
        <h2 className="srs-section-title">Tasks</h2>
        {jobsQuery.isLoading ? (
          <div className="srs-grid">
            {[0, 1, 2].map((i) => <div key={i} className="srs-skeleton" />)}
          </div>
        ) : (
          <div className="srs-grid">
            {jobs.map((job) => (
              <TaskCard
                key={job.id}
                job={job}
                onRun={setPendingJob}
                onToggle={(target) => toggleMutation.mutate({ job: target })}
                onViewHistory={viewHistory}
                toggling={toggleMutation.isPending}
                runDisabled={runMutation.isPending}
              />
            ))}
          </div>
        )}
      </section>

      <section id="srs-history">
        <div className="srs-runs-head">
          <h2 className="srs-section-title">Activity history</h2>
          <div className="srs-filters">
            <select
              className="srs-select"
              value={jobFilter}
              onChange={(e) => { setJobFilter(e.target.value); setPage(0); }}
              aria-label="Filter by task"
            >
              <option value="">All tasks</option>
              {jobs.map((job) => <option key={job.id} value={job.id}>{job.name}</option>)}
            </select>
            <select
              className="srs-select"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
              aria-label="Filter by result"
            >
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
          </div>
        </div>

        <div className="srs-table-wrap">
          <table className="srs-table">
            <thead>
              <tr>
                <th>Task</th>
                <th>How it started</th>
                <th>Result</th>
                <th>Started</th>
                <th>Duration</th>
                <th>Started by</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {runsQuery.isLoading && (
                <tr><td colSpan={7} className="srs-empty">Loading activity…</td></tr>
              )}
              {!runsQuery.isLoading && runs.length === 0 && (
                <tr><td colSpan={7} className="srs-empty">No activity recorded for these filters yet.</td></tr>
              )}
              {runs.map((run) => (
                <tr key={run.id}>
                  <td className="srs-strong">{run.jobName}</td>
                  <td>
                    <span className={`srs-trigger ${run.triggerType === "MANUAL" ? "srs-trigger--manual" : ""}`}>
                      {run.triggerType === "MANUAL" ? "Started manually" : "Automatic"}
                    </span>
                  </td>
                  <td><StatusPill status={run.status} /></td>
                  <td className="srs-nowrap">{formatDateTime(run.startedAt)}</td>
                  <td className="srs-nowrap">{formatDuration(run.durationMs)}</td>
                  <td>{run.triggeredBy ?? "—"}</td>
                  <td className="srs-details">
                    {run.errorMessage
                      ? <span title={run.errorMessage}>{run.errorMessage}</span>
                      : run.status === "SUCCESS"
                        ? <CheckCircleIcon weight="fill" className="size-4 srs-ok" aria-label="Completed" />
                        : run.status === "SKIPPED"
                          ? <span className="srs-muted">Skipped while paused</span>
                          : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="srs-pager">
          <span className="srs-pager-info">
            {totalElements} entr{totalElements === 1 ? "y" : "ies"}
            {totalPages > 0 && ` · page ${page + 1} of ${totalPages}`}
          </span>
          <div className="srs-pager-buttons">
            <button type="button" className="srs-btn" onClick={() => setPage((p) => Math.max(p - 1, 0))} disabled={page === 0}>
              <CaretLeftIcon weight="bold" className="size-3.5" aria-hidden="true" />
              Newer
            </button>
            <button
              type="button"
              className="srs-btn"
              onClick={() => setPage((p) => p + 1)}
              disabled={totalPages === 0 || page >= totalPages - 1}
            >
              Older
              <CaretRightIcon weight="bold" className="size-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>

      <AlertDialog open={!!pendingJob} onOpenChange={(open) => { if (!open) setPendingJob(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Run “{pendingJob?.name}” now?</AlertDialogTitle>
            <AlertDialogDescription>
              The task runs in the background and its result is recorded in the activity history.
              {pendingJob?.warningMessage ? ` ${pendingJob.warningMessage}` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={runMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={runMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (pendingJob) runMutation.mutate(pendingJob.id);
              }}
            >
              {runMutation.isPending ? "Starting…" : "Run now"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
