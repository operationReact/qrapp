import { createFileRoute, Link, Navigate, useLocation } from "@tanstack/react-router";
import { useAuth } from "@/context/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchOpsHealth, triggerSync } from "@/services/opsService";
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
  ArrowsClockwiseIcon,
  ArrowClockwiseIcon,
  CheckCircleIcon,
  CircleNotchIcon,
  CpuIcon,
  DatabaseIcon,
  HardDrivesIcon,
  HeartbeatIcon,
  ChartLineUpIcon,
  ClockCounterClockwiseIcon,
  TerminalWindowIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";

export const Route = createFileRoute("/admin/ops-center")({
  component: OpsCenterPage,
});

const MENU_SYNC = {
  type: "menu",
  name: "Menu Sync",
  description: "Clears menu, combo, and item caches so the latest menu is served on the next customer request.",
};

function pluralRegions(count) {
  return `${count} cache region${count === 1 ? "" : "s"} active`;
}

function HealthCard({ title, icon, status, meta }) {
  const Icon = icon;
  const variant = status === "UP" ? "" : status === "UNKNOWN" ? "unknown" : "down";
  const pillClass = status === "UP" ? "opc-pill" : status === "UNKNOWN" ? "opc-pill opc-pill--unknown" : "opc-pill opc-pill--down";
  return (
    <div className={`opc-health ${variant ? `opc-health--${variant}` : ""}`}>
      <div className="opc-health-icon">
        <Icon weight="duotone" className="size-5" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <div className="opc-health-row">
          <span className="opc-health-name">{title}</span>
          <span className={pillClass}>{status}</span>
        </div>
        <div className="opc-health-meta">{meta}</div>
      </div>
    </div>
  );
}

function OpsCenterPage() {
  const { isAdmin, isSuperUser } = useAuth();
  const { pathname } = useLocation();
  const queryClient = useQueryClient();
  const [confirmSync, setConfirmSync] = useState(false);

  const { data: healthData, isLoading: healthLoading, isFetching, refetch } = useQuery({
    queryKey: ["ops", "health"],
    queryFn: fetchOpsHealth,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const syncMutation = useMutation({
    mutationFn: () => triggerSync(MENU_SYNC.type),
    onSuccess: (data) => {
      toast.success("Menu sync complete", { description: data?.message });
      queryClient.invalidateQueries({ queryKey: ["ops", "health"] });
      setConfirmSync(false);
    },
    onError: (error) => {
      toast.error("Sync failed", { description: error?.response?.data?.error ?? "Menu sync failed" });
      setConfirmSync(false);
    },
  });

  if (!isAdmin && !isSuperUser) {
    return <Navigate to="/login" replace state={{ from: pathname }} />;
  }

  const health = healthData ?? {};
  const statuses = [health.application?.status, health.database?.status, health.mainCache?.status, health.analyticsCache?.status];
  const anyDown = statuses.some((s) => s && s !== "UP");
  const allUp = healthData && !anyDown && statuses.every((s) => s === "UP");
  const overallClass = anyDown ? "opc-status opc-status--down" : allUp ? "opc-status" : "opc-status opc-status--warn";
  const OverallIcon = anyDown ? WarningCircleIcon : allUp ? CheckCircleIcon : CircleNotchIcon;

  return (
    <div className="opc">
      <div className="opc-head">
        <div>
          <h1 className="opc-title">Operations Center</h1>
          <p className="opc-sub">Check system health and refresh the menu cache.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/admin/background-tasks" className="opc-refresh">
            <ClockCounterClockwiseIcon weight="bold" className="size-3.5" />
            Background tasks
          </Link>
          <button type="button" className="opc-refresh" onClick={() => refetch()} disabled={isFetching}>
            <ArrowClockwiseIcon weight="bold" className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className={overallClass} role="status">
        <div className="opc-status-icon">
          <OverallIcon weight="fill" className={`size-5 ${!anyDown && !allUp ? "animate-spin" : ""}`} aria-hidden="true" />
        </div>
        <div>
          <div className="opc-status-title">
            {anyDown ? "Some services need attention" : allUp ? "All systems operational" : "Checking system health…"}
          </div>
          <div className="opc-status-desc">
            {anyDown ? "Review the services marked DOWN below." : allUp ? "Application, database and caches are responding normally." : "Waiting for the latest status."}
          </div>
        </div>
      </div>

      <section>
        <h2 className="opc-section-title">
          <HeartbeatIcon weight="bold" className="size-4" aria-hidden="true" />
          System health
        </h2>
        {healthLoading ? (
          <div className="opc-health-grid">
            {[0, 1, 2, 3].map((i) => <div key={i} className="opc-skeleton" />)}
          </div>
        ) : (
          <div className="opc-health-grid">
            <HealthCard
              title="Application"
              icon={CpuIcon}
              status={health.application?.status ?? "UNKNOWN"}
              meta="API server"
            />
            <HealthCard
              title="Database"
              icon={DatabaseIcon}
              status={health.database?.status ?? "UNKNOWN"}
              meta={health.database?.message ?? "Connection status"}
            />
            <HealthCard
              title="App cache"
              icon={HardDrivesIcon}
              status={health.mainCache?.status ?? "UNKNOWN"}
              meta={pluralRegions(health.mainCache?.count ?? 0)}
            />
            <HealthCard
              title="Analytics cache"
              icon={ChartLineUpIcon}
              status={health.analyticsCache?.status ?? "UNKNOWN"}
              meta={pluralRegions(health.analyticsCache?.count ?? 0)}
            />
          </div>
        )}
      </section>

      <section>
        <h2 className="opc-section-title">
          <ArrowsClockwiseIcon weight="bold" className="size-4" aria-hidden="true" />
          Menu cache
        </h2>
        <div className="opc-sync">
          <div className="opc-sync-main">
            <div className="opc-sync-icon">
              <TerminalWindowIcon weight="duotone" className="size-5" aria-hidden="true" />
            </div>
            <div>
              <div className="opc-sync-name">{MENU_SYNC.name}</div>
              <p className="opc-sync-desc">{MENU_SYNC.description}</p>
            </div>
          </div>
          <button
            type="button"
            className="opc-sync-btn"
            onClick={() => setConfirmSync(true)}
            disabled={syncMutation.isPending}
          >
            <ArrowsClockwiseIcon weight="bold" className="size-4" aria-hidden="true" />
            Sync now
          </button>
        </div>
      </section>

      <AlertDialog open={confirmSync} onOpenChange={(v) => !v && setConfirmSync(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Run menu sync?</AlertDialogTitle>
            <AlertDialogDescription>{MENU_SYNC.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="gap-2"
              onClick={(e) => {
                e.preventDefault();
                syncMutation.mutate();
              }}
              disabled={syncMutation.isPending}
            >
              {syncMutation.isPending ? (
                <><CircleNotchIcon className="size-4 animate-spin" /> Syncing…</>
              ) : (
                <><ArrowsClockwiseIcon weight="bold" className="size-4" /> Confirm sync</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
