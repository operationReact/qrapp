import { createFileRoute, Navigate, useLocation } from "@tanstack/react-router";
import { useAuth } from "@/context/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchOpsJobs,
  fetchOpsHistory,
  fetchOpsHealth,
  triggerOpsJob,
  triggerSync,
} from "@/services/opsService";
import { Button } from "@/components/ui/button";
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
import { useState } from "react";
import {
  PlayIcon,
  ArrowsClockwiseIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  WarningCircleIcon,
  CircleNotchIcon,
  CircleIcon,
  HeartbeatIcon,
  DatabaseIcon,
  HardDrivesIcon,
  CpuIcon,
  ChartLineUpIcon,
  CalendarCheckIcon,
  ListChecksIcon,
  ClockCountdownIcon,
  ArrowClockwiseIcon,
  BroadcastIcon,
  TerminalWindowIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/ops-center")({
  component: OpsCenterPage,
});

// ── Helpers ─────────────────────────────────────────────────────────────────

function fmtRelative(isoStr) {
  if (!isoStr) return "Never";
  const diff = Date.now() - new Date(isoStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function fmtDuration(ms) {
  if (!ms || ms <= 0) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function StatusBadge({ status }) {
  const variants = {
    IDLE:    "bg-zinc-100 text-zinc-600 border-zinc-200",
    RUNNING: "bg-amber-50 text-amber-700 border-amber-200",
    SUCCESS: "bg-emerald-50 text-emerald-700 border-emerald-200",
    FAILED:  "bg-red-50 text-red-700 border-red-200",
  };
  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border",
      variants[status] ?? variants.IDLE
    )}>
      {status === "RUNNING" && <CircleNotchIcon className="size-3 animate-spin" />}
      {status}
    </span>
  );
}

const CATEGORY_ICONS = {
  Analytics:       ChartLineUpIcon,
  Recommendations: ListChecksIcon,
};

// ── Job Card ────────────────────────────────────────────────────────────────

function JobCard({ job, onTrigger }) {
  const CategoryIcon = CATEGORY_ICONS[job.category] ?? CpuIcon;

  return (
    <div className={cn(
      "rounded-xl border bg-white p-4 flex flex-col gap-3 transition-shadow hover:shadow-sm",
      job.status === "RUNNING" && "border-amber-200 bg-amber-50/30",
      job.status === "FAILED"  && "border-red-200  bg-red-50/30",
      job.status === "SUCCESS" && "border-emerald-200/60",
    )}>
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={cn(
            "size-8 rounded-lg flex items-center justify-center shrink-0 border",
            job.status === "RUNNING" ? "bg-amber-50 border-amber-200" :
            job.status === "FAILED"  ? "bg-red-50 border-red-200" :
            job.status === "SUCCESS" ? "bg-emerald-50 border-emerald-200" :
            "bg-zinc-50 border-zinc-200"
          )}>
            <CategoryIcon
              weight="duotone"
              className={cn(
                "size-4",
                job.status === "RUNNING" ? "text-amber-600" :
                job.status === "FAILED"  ? "text-red-600" :
                job.status === "SUCCESS" ? "text-emerald-600" :
                "text-zinc-500"
              )}
            />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-zinc-900 truncate">{job.name}</div>
            <div className="text-xs text-zinc-500 font-mono">{job.schedule}</div>
          </div>
        </div>
        <StatusBadge status={job.status} />
      </div>

      {/* Description */}
      <p className="text-xs text-zinc-500 leading-relaxed line-clamp-2">{job.description}</p>

      {/* Metrics row */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-zinc-50 border border-zinc-100 px-3 py-2">
          <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-medium">Last Run</div>
          <div className="text-xs font-semibold text-zinc-700 mt-0.5">{fmtRelative(job.lastRunAt)}</div>
        </div>
        <div className="rounded-lg bg-zinc-50 border border-zinc-100 px-3 py-2">
          <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-medium">Duration</div>
          <div className="text-xs font-semibold text-zinc-700 mt-0.5">{fmtDuration(job.durationMs)}</div>
        </div>
      </div>

      {/* Error message */}
      {job.status === "FAILED" && job.lastError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2">
          <div className="text-[10px] text-red-500 uppercase tracking-wider font-medium mb-0.5">Error</div>
          <div className="text-xs text-red-700 font-mono line-clamp-2">{job.lastError}</div>
        </div>
      )}

      {/* Warning */}
      {job.warningMessage && (
        <div className="flex items-start gap-1.5 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
          <WarningCircleIcon weight="fill" className="size-3.5 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-700">{job.warningMessage}</p>
        </div>
      )}

      {/* Action */}
      <Button
        size="sm"
        variant={job.status === "FAILED" ? "destructive" : "outline"}
        className="w-full gap-2 h-9 text-sm font-medium"
        onClick={() => onTrigger(job)}
        disabled={job.status === "RUNNING"}
      >
        {job.status === "RUNNING" ? (
          <>
            <CircleNotchIcon className="size-3.5 animate-spin" />
            Running…
          </>
        ) : (
          <>
            <PlayIcon weight="fill" className="size-3.5" />
            Run Now
          </>
        )}
      </Button>
    </div>
  );
}

// ── Sync Cards ──────────────────────────────────────────────────────────────

const SYNC_CONFIGS = [
  {
    type: "menu",
    name: "Menu Sync",
    description: "Clears all menu, combo, and item caches so the latest menu data is served on the next customer request.",
    icon: TerminalWindowIcon,
    color: "blue",
    warning: null,
  },
  {
    type: "inventory",
    name: "Inventory Sync",
    description: "Evicts inventory and availability caches to reflect any recent stock changes across the storefront.",
    icon: HardDrivesIcon,
    color: "purple",
    warning: null,
  },
  {
    type: "analytics",
    name: "Analytics Refresh",
    description: "Runs all intraday analytics snapshots (sales, orders, menu, coupons) so dashboards reflect current data.",
    icon: ChartLineUpIcon,
    color: "teal",
    warning: null,
  },
  {
    type: "recommendations",
    name: "Recommendation Flush",
    description: "Clears the recommendation cache. Use the 'Recommendation Engine' job to fully recompute suggestions.",
    icon: BroadcastIcon,
    color: "indigo",
    warning: null,
  },
  {
    type: "promotions",
    name: "Promotion Refresh",
    description: "Evicts promotion and combo caches so updated rules are applied immediately to incoming orders.",
    icon: CalendarCheckIcon,
    color: "rose",
    warning: null,
  },
];

const SYNC_COLOR_MAP = {
  blue:   { bg: "bg-blue-50",   border: "border-blue-200",   icon: "text-blue-600",   btn: "border-blue-300 text-blue-700 hover:bg-blue-50" },
  purple: { bg: "bg-purple-50", border: "border-purple-200", icon: "text-purple-600", btn: "border-purple-300 text-purple-700 hover:bg-purple-50" },
  teal:   { bg: "bg-teal-50",   border: "border-teal-200",   icon: "text-teal-600",   btn: "border-teal-300 text-teal-700 hover:bg-teal-50" },
  indigo: { bg: "bg-indigo-50", border: "border-indigo-200", icon: "text-indigo-600", btn: "border-indigo-300 text-indigo-700 hover:bg-indigo-50" },
  rose:   { bg: "bg-rose-50",   border: "border-rose-200",   icon: "text-rose-600",   btn: "border-rose-300 text-rose-700 hover:bg-rose-50" },
};

function SyncCard({ config, onSync, pending }) {
  const SyncIcon = config.icon;
  const colors = SYNC_COLOR_MAP[config.color];

  return (
    <div className="rounded-xl border bg-white p-4 flex flex-col gap-3 hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-3">
        <div className={cn("size-9 rounded-lg flex items-center justify-center border shrink-0", colors.bg, colors.border)}>
          <SyncIcon weight="duotone" className={cn("size-4.5", colors.icon)} />
        </div>
        <div>
          <div className="text-sm font-semibold text-zinc-900">{config.name}</div>
        </div>
      </div>
      <p className="text-xs text-zinc-500 leading-relaxed">{config.description}</p>
      <Button
        size="sm"
        variant="outline"
        className={cn("w-full gap-2 h-9 text-sm font-medium border", colors.btn)}
        onClick={() => onSync(config)}
        disabled={pending === config.type}
      >
        {pending === config.type ? (
          <>
            <CircleNotchIcon className="size-3.5 animate-spin" />
            Syncing…
          </>
        ) : (
          <>
            <ArrowsClockwiseIcon weight="bold" className="size-3.5" />
            Sync Now
          </>
        )}
      </Button>
    </div>
  );
}

// ── Health Cards ────────────────────────────────────────────────────────────

function HealthCard({ title, icon, status, meta }) {
  const Icon = icon;
  const isUp = status === "UP";
  return (
    <div className={cn(
      "rounded-xl border p-4 flex items-center gap-4",
      isUp ? "bg-emerald-50/40 border-emerald-200/60" : "bg-red-50/40 border-red-200/60"
    )}>
      <div className={cn(
        "size-10 rounded-xl flex items-center justify-center border shrink-0",
        isUp ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"
      )}>
        <Icon weight="duotone" className={cn("size-5", isUp ? "text-emerald-600" : "text-red-600")} />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-zinc-900">{title}</span>
          <span className={cn(
            "text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider",
            isUp ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
          )}>
            {isUp ? "UP" : "DOWN"}
          </span>
        </div>
        {meta && <p className="text-xs text-zinc-500 mt-0.5 truncate">{meta}</p>}
      </div>
    </div>
  );
}

// ── Audit Table ─────────────────────────────────────────────────────────────

function AuditTable({ entries }) {
  if (!entries || entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-zinc-400">
        <ClockCountdownIcon size={32} weight="duotone" className="mb-2" />
        <p className="text-sm">No execution history yet.</p>
        <p className="text-xs mt-1">Run a job to see it here.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-sm min-w-[540px]">
        <thead>
          <tr className="border-b text-left">
            <th className="pb-2 px-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Job</th>
            <th className="pb-2 px-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
            <th className="pb-2 px-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Triggered</th>
            <th className="pb-2 px-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Duration</th>
            <th className="pb-2 px-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">By</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id} className="border-b border-zinc-50 hover:bg-zinc-50/60 transition-colors">
              <td className="py-2.5 px-2">
                <span className="text-sm font-medium text-zinc-800">{entry.jobName}</span>
              </td>
              <td className="py-2.5 px-2">
                <StatusBadge status={entry.status} />
              </td>
              <td className="py-2.5 px-2">
                <span className="text-xs text-zinc-500">{fmtRelative(entry.triggeredAt)}</span>
              </td>
              <td className="py-2.5 px-2">
                <span className="text-xs font-mono text-zinc-600">{fmtDuration(entry.durationMs)}</span>
              </td>
              <td className="py-2.5 px-2">
                <span className="text-xs text-zinc-500">{entry.triggeredBy}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Section Header ──────────────────────────────────────────────────────────

function SectionHeader({ icon, title, description, actions }) {
  const Icon = icon;
  return (
    <div className="flex items-start justify-between gap-4 mb-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="size-9 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center shrink-0">
          <Icon weight="duotone" className="size-5 text-zinc-600" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-zinc-900">{title}</h2>
          {description && <p className="text-xs text-zinc-500 mt-0.5">{description}</p>}
        </div>
      </div>
      {actions}
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

function OpsCenterPage() {
  const { isAdmin, isSuperUser } = useAuth();
  const { pathname } = useLocation();
  const queryClient = useQueryClient();

  const [confirmJob, setConfirmJob]   = useState(null);
  const [confirmSync, setConfirmSync] = useState(null);
  const [pendingSync, setPendingSync] = useState(null);

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: jobsData, isLoading: jobsLoading, refetch: refetchJobs } = useQuery({
    queryKey: ["ops", "jobs"],
    queryFn: fetchOpsJobs,
    staleTime: 0,
    refetchInterval: (query) => {
      const jobs = query.state.data?.jobs ?? [];
      const anyRunning = jobs.some((j) => j.status === "RUNNING");
      return anyRunning ? 2000 : false;
    },
  });

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ["ops", "history"],
    queryFn: fetchOpsHistory,
    staleTime: 0,
    refetchInterval: 10_000,
  });

  const { data: healthData } = useQuery({
    queryKey: ["ops", "health"],
    queryFn: fetchOpsHealth,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  // ── Mutations ──────────────────────────────────────────────────────────────

  const triggerMutation = useMutation({
    mutationFn: (jobId) => triggerOpsJob(jobId),
    onSuccess: () => {
      toast.success(`Job started`, { description: `"${confirmJob?.name}" is now running.` });
      queryClient.invalidateQueries({ queryKey: ["ops", "jobs"] });
      setConfirmJob(null);
    },
    onError: (error) => {
      const msg = error?.response?.data?.error ?? "Failed to trigger job";
      const isConflict = error?.response?.status === 409;
      if (isConflict) {
        toast.warning("Job already running", { description: "Wait for the current run to complete." });
      } else {
        toast.error("Trigger failed", { description: msg });
      }
      setConfirmJob(null);
    },
  });

  const syncMutation = useMutation({
    mutationFn: (type) => triggerSync(type),
    onMutate: (type) => setPendingSync(type),
    onSuccess: (data) => {
      toast.success("Sync complete", { description: data.message });
      queryClient.invalidateQueries({ queryKey: ["ops", "health"] });
      setPendingSync(null);
      setConfirmSync(null);
    },
    onError: (error) => {
      const msg = error?.response?.data?.error ?? "Sync operation failed";
      toast.error("Sync failed", { description: msg });
      setPendingSync(null);
      setConfirmSync(null);
    },
  });

  // ── Guard ──────────────────────────────────────────────────────────────────

  if (!isAdmin && !isSuperUser) {
    return <Navigate to="/login" replace state={{ from: pathname }} />;
  }

  // ── Derived data ───────────────────────────────────────────────────────────

  const jobs    = jobsData?.jobs ?? [];
  const entries = historyData?.entries ?? [];

  const jobsByCategory = {};
  for (const job of jobs) {
    if (!jobsByCategory[job.category]) jobsByCategory[job.category] = [];
    jobsByCategory[job.category].push(job);
  }

  const health = healthData ?? {};
  const schedulerStats = health.schedulers ?? {};
  const mainCacheCnt   = health.mainCache?.count ?? 0;
  const analyticsCacheCnt = health.analyticsCache?.count ?? 0;

  const anyRunning = jobs.some((j) => j.status === "RUNNING");
  const anyFailed  = jobs.some((j) => j.status === "FAILED");

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-full">
      {/* ── Page Header ────────────────────────────────────────────────── */}
      <div className="px-4 pt-6 pb-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-[28px] leading-tight">
            Operations Center
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground max-w-md">
            Manage background jobs, trigger data syncs, and monitor system health.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-2 text-sm font-medium shrink-0"
          onClick={() => {
            refetchJobs();
            queryClient.invalidateQueries({ queryKey: ["ops"] });
          }}
        >
          <ArrowClockwiseIcon weight="bold" className="size-3.5" />
          Refresh
        </Button>
      </div>

      {/* Status banner */}
      {(anyRunning || anyFailed) && (
        <div className={cn(
          "mx-4 mt-2 mb-1 rounded-xl px-4 py-3 border flex items-center gap-3 text-sm font-medium",
          anyFailed  ? "bg-red-50 border-red-200 text-red-800" :
          anyRunning ? "bg-amber-50 border-amber-200 text-amber-800" : ""
        )}>
          {anyRunning && <CircleNotchIcon className="size-4 animate-spin shrink-0 text-amber-600" />}
          {!anyRunning && anyFailed && <WarningCircleIcon weight="fill" className="size-4 shrink-0 text-red-600" />}
          <span>
            {anyRunning && `${jobs.filter((j) => j.status === "RUNNING").length} job(s) currently running`}
            {anyRunning && anyFailed && " · "}
            {anyFailed  && `${jobs.filter((j) => j.status === "FAILED").length} job(s) need attention`}
          </span>
        </div>
      )}

      <div className="flex-1 flex flex-col gap-8 px-4 py-4 pb-10">

        {/* ── System Health ─────────────────────────────────────────────── */}
        <section>
          <SectionHeader
            icon={HeartbeatIcon}
            title="System Health"
            description="Live status of application services and data pipelines."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            <HealthCard
              title="Application"
              icon={CpuIcon}
              status={health.application?.status ?? "UP"}
              meta="API server running normally"
            />
            <HealthCard
              title="Database"
              icon={DatabaseIcon}
              status={health.database?.status ?? "UP"}
              meta={health.database?.message ?? "Connection healthy"}
            />
            <HealthCard
              title="App Cache"
              icon={HardDrivesIcon}
              status={health.mainCache?.status ?? "UP"}
              meta={`${mainCacheCnt} cache region${mainCacheCnt !== 1 ? "s" : ""} active`}
            />
            <HealthCard
              title="Analytics Cache"
              icon={ChartLineUpIcon}
              status={health.analyticsCache?.status ?? "UP"}
              meta={`${analyticsCacheCnt} cache region${analyticsCacheCnt !== 1 ? "s" : ""} active`}
            />
          </div>

          {/* Scheduler summary strip */}
          {schedulerStats.total > 0 && (
            <div className="mt-3 rounded-xl border bg-white px-4 py-3 flex flex-wrap gap-4">
              <div className="flex items-center gap-1.5 text-sm text-zinc-600">
                <ClockIcon weight="duotone" className="size-4 text-zinc-400" />
                <span className="font-medium">{schedulerStats.total}</span> schedulers registered
              </div>
              {schedulerStats.running > 0 && (
                <div className="flex items-center gap-1.5 text-sm text-amber-700">
                  <CircleNotchIcon className="size-4 animate-spin" />
                  <span className="font-semibold">{schedulerStats.running}</span> running
                </div>
              )}
              {schedulerStats.success > 0 && (
                <div className="flex items-center gap-1.5 text-sm text-emerald-700">
                  <CheckCircleIcon weight="fill" className="size-4" />
                  <span className="font-semibold">{schedulerStats.success}</span> succeeded
                </div>
              )}
              {schedulerStats.failed > 0 && (
                <div className="flex items-center gap-1.5 text-sm text-red-700">
                  <XCircleIcon weight="fill" className="size-4" />
                  <span className="font-semibold">{schedulerStats.failed}</span> failed
                </div>
              )}
              {schedulerStats.idle > 0 && (
                <div className="flex items-center gap-1.5 text-sm text-zinc-500">
                  <CircleIcon weight="fill" className="size-3.5" />
                  <span className="font-semibold">{schedulerStats.idle}</span> idle
                </div>
              )}
            </div>
          )}
        </section>

        {/* ── Sync Center ───────────────────────────────────────────────── */}
        <section>
          <SectionHeader
            icon={ArrowsClockwiseIcon}
            title="Sync Center"
            description="Flush caches and trigger targeted data refresh operations."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {SYNC_CONFIGS.map((config) => (
              <SyncCard
                key={config.type}
                config={config}
                onSync={(c) => setConfirmSync(c)}
                pending={pendingSync}
              />
            ))}
          </div>
        </section>

        {/* ── Job Control ───────────────────────────────────────────────── */}
        <section>
          <SectionHeader
            icon={TerminalWindowIcon}
            title="Job Control"
            description="Manually trigger scheduled background jobs and monitor execution state."
          />

          {jobsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="rounded-xl border bg-zinc-50 animate-pulse h-52" />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {Object.entries(jobsByCategory).map(([category, categoryJobs]) => (
                <div key={category}>
                  <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3 px-0.5">
                    {category}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {categoryJobs.map((job) => (
                      <JobCard key={job.id} job={job} onTrigger={(j) => setConfirmJob(j)} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Execution History ─────────────────────────────────────────── */}
        <section>
          <SectionHeader
            icon={ListChecksIcon}
            title="Execution History"
            description="Audit log of manually triggered job executions."
          />
          <div className="rounded-xl border bg-white p-4">
            {historyLoading ? (
              <div className="h-24 animate-pulse bg-zinc-50 rounded-lg" />
            ) : (
              <AuditTable entries={entries} />
            )}
          </div>
        </section>
      </div>

      {/* ── Job Confirm Dialog ─────────────────────────────────────────── */}
      <AlertDialog open={!!confirmJob} onOpenChange={(v) => !v && setConfirmJob(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Run "{confirmJob?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="block mb-2">{confirmJob?.description}</span>
              <span className="block text-zinc-500">
                <strong>Schedule:</strong> {confirmJob?.schedule}
              </span>
              {confirmJob?.warningMessage && (
                <span className="mt-3 flex items-start gap-1.5 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-amber-700">
                  <WarningCircleIcon weight="fill" className="size-4 shrink-0 mt-0.5 text-amber-500" />
                  {confirmJob.warningMessage}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
              onClick={() => triggerMutation.mutate(confirmJob?.id)}
              disabled={triggerMutation.isPending}
            >
              {triggerMutation.isPending ? (
                <><CircleNotchIcon className="size-4 animate-spin" /> Starting…</>
              ) : (
                <><PlayIcon weight="fill" className="size-4" /> Run Now</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Sync Confirm Dialog ────────────────────────────────────────── */}
      <AlertDialog open={!!confirmSync} onOpenChange={(v) => !v && setConfirmSync(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Run "{confirmSync?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmSync?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="gap-2"
              onClick={() => syncMutation.mutate(confirmSync?.type)}
              disabled={syncMutation.isPending}
            >
              {syncMutation.isPending ? (
                <><CircleNotchIcon className="size-4 animate-spin" /> Syncing…</>
              ) : (
                <><ArrowsClockwiseIcon weight="bold" className="size-4" /> Confirm Sync</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
