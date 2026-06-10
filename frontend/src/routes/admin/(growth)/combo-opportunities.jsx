import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  comboOpportunitiesOptions,
  missedOpportunitiesOptions,
} from "@/query/options/combos";
import { reviewComboOpportunity, triggerComboAnalysis } from "@/services/comboService";
import AdminHeader from "@/components/admin/AdminHeader";
import EditComboOpportunityDrawer from "@/components/admin/combo/EditComboOpportunityDrawer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  SparkleIcon,
  CheckIcon,
  XIcon,
  PencilSimpleIcon,
  StarIcon,
  CheckCircleIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";

// Route is intentionally declared before helper functions so TanStack Router's
// Vite plugin finds the createFileRoute call at the top of the module.
export const Route = createFileRoute("/admin/(growth)/combo-opportunities")({
  component: AdminComboOpportunitiesPage,
});

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmtCur = (n) =>
  n == null
    ? "—"
    : `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Number(n))}`;

function confidenceToStars(confidence) {
  if (confidence >= 0.85) return 5;
  if (confidence >= 0.70) return 4;
  if (confidence >= 0.55) return 3;
  if (confidence >= 0.35) return 2;
  return 1;
}

function qualityInfo(score) {
  if (score >= 90) return { label: "Excellent", cls: "text-emerald-700 bg-emerald-50 border-emerald-200" };
  if (score >= 75) return { label: "Good",      cls: "text-blue-700 bg-blue-50 border-blue-200" };
  if (score >= 55) return { label: "Fair",      cls: "text-amber-700 bg-amber-50 border-amber-200" };
  return                   { label: "Poor",      cls: "text-red-700 bg-red-50 border-red-200" };
}

const STATUS_CONFIG = {
  PENDING_REVIEW: { label: "Pending Review", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  APPROVED:       { label: "Approved",        cls: "bg-blue-50 text-blue-700 border-blue-200" },
  LIVE:           { label: "Live",            cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  REJECTED:       { label: "Rejected",        cls: "bg-red-50 text-red-600 border-red-200" },
};

// ── Sub-components ────────────────────────────────────────────────────────────

function StarRow({ count }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <StarIcon
          key={i}
          weight={i <= count ? "fill" : "regular"}
          className={cn("size-3.5", i <= count ? "text-amber-400" : "text-zinc-200")}
        />
      ))}
    </div>
  );
}

function StatusBadge({ status }) {
  const { label, cls } =
    STATUS_CONFIG[status] ?? { label: status, cls: "bg-zinc-100 text-zinc-600 border-zinc-200" };
  return (
    <span className={cn("inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full border", cls)}>
      {label}
    </span>
  );
}

// ── Opportunity Card ──────────────────────────────────────────────────────────
function OpportunityCard({ opportunity: o, onEdit, onApprove, onReject, submitting }) {
  const stars = confidenceToStars(o.confidence ?? 0);
  const qi = qualityInfo(o.qualityScore ?? 0);
  const isPending  = o.status === "PENDING_REVIEW";
  const isApproved = o.status === "APPROVED";
  const isLive     = o.status === "LIVE";
  const isRejected = o.status === "REJECTED";

  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col">
      {/* ── Header ── */}
      <div className="p-4 border-b border-zinc-100">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <StarRow count={stars} />
              <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">
                {stars >= 4 ? "HIGH CONFIDENCE" : stars >= 3 ? "MEDIUM CONFIDENCE" : "LOW CONFIDENCE"}
              </span>
            </div>
            <h3 className="text-[15px] font-bold text-foreground mt-1.5 leading-snug">
              {o.comboName}
            </h3>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <span className={cn("inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-full border", qi.cls)}>
              {o.qualityScore}/100 · {qi.label}
            </span>
            <StatusBadge status={o.status} />
          </div>
        </div>
      </div>

      {/* ── Items ── */}
      <div className="px-4 py-3">
        <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-2">Includes</p>
        <div className="space-y-1.5">
          {(o.items ?? []).map((item) => (
            <div key={item.menuItemId} className="flex items-center gap-2">
              <CheckIcon weight="bold" className="size-3 text-primary shrink-0" />
              <span className="text-sm text-foreground font-medium flex-1 truncate">{item.name}</span>
              <span className="text-xs text-muted-foreground tabular-nums">{fmtCur(item.price)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Pricing ── */}
      <div className="px-4 py-3 grid grid-cols-2 gap-2 border-t border-zinc-100">
        <div className="bg-zinc-50 rounded-xl px-3 py-2">
          <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-0.5">
            Individual Price
          </p>
          <p className="text-sm font-bold text-zinc-400 line-through">{fmtCur(o.individualPrice)}</p>
        </div>
        <div className="bg-primary/5 rounded-xl px-3 py-2">
          <p className="text-[10px] font-semibold text-primary/60 uppercase tracking-wide mb-0.5">
            Suggested Price
          </p>
          <p className="text-sm font-bold text-primary">{fmtCur(o.suggestedPrice)}</p>
        </div>
      </div>

      {/* ── Quality Metrics ── */}
      <div className="px-4 py-3 grid grid-cols-3 border-t border-zinc-100">
        <div className="text-center py-1">
          <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">Profit</p>
          <p className="text-sm font-bold text-emerald-700 mt-0.5">{fmtCur(o.profit)}</p>
        </div>
        <div className="text-center py-1 border-x border-zinc-100">
          <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">Margin</p>
          <p className="text-sm font-bold text-foreground mt-0.5">{o.margin ?? 0}%</p>
        </div>
        <div className="text-center py-1">
          <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">Rev. Impact</p>
          <p className="text-sm font-bold text-blue-700 mt-0.5">+{o.revenueImpact ?? 0}%</p>
        </div>
      </div>

      {/* ── Why Generated ── */}
      {(o.reasons ?? []).length > 0 && (
        <div className="px-4 py-3 border-t border-zinc-100">
          <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-2">
            Generated Because
          </p>
          <div className="space-y-1.5">
            {(o.reasons ?? []).map((reason, i) => (
              <div key={i} className="flex items-start gap-2">
                <CheckIcon weight="bold" className="size-3 text-primary mt-0.5 shrink-0" />
                <span className="text-xs text-foreground leading-relaxed">{reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Attachment confidence bar ── */}
      {o.attachmentConfidence != null && (
        <div className="px-4 py-2.5 border-t border-zinc-100 bg-zinc-50/50">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-muted-foreground">Attachment Confidence</span>
            <span className="text-xs font-bold text-foreground">{o.attachmentConfidence}%</span>
          </div>
          <div className="h-1.5 bg-zinc-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${o.attachmentConfidence}%` }}
            />
          </div>
        </div>
      )}

      {/* ── Actions ── */}
      <div className="px-4 py-3 border-t border-zinc-100 mt-auto">
        {isPending && (
          <div className="flex gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-9 text-emerald-700 border-emerald-200 hover:bg-emerald-50 font-semibold text-xs"
              onClick={() => onApprove(o.id)}
              disabled={submitting}
            >
              <CheckIcon className="size-3.5 mr-1" weight="bold" /> Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-9 font-semibold text-xs"
              onClick={() => onEdit(o)}
              disabled={submitting}
            >
              <PencilSimpleIcon className="size-3.5 mr-1" /> Edit
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-9 text-destructive border-destructive/30 hover:bg-destructive/5 font-semibold text-xs"
              onClick={() => onReject(o.id)}
              disabled={submitting}
            >
              <XIcon className="size-3.5 mr-1" weight="bold" /> Reject
            </Button>
          </div>
        )}
        {isApproved && (
          <p className="text-xs text-blue-700 font-semibold flex items-center gap-1.5">
            <CheckCircleIcon weight="fill" className="size-4" />
            Approved — ready to publish
          </p>
        )}
        {isLive && (
          <p className="text-xs text-emerald-700 font-semibold flex items-center gap-1.5">
            <CheckCircleIcon weight="fill" className="size-4" />
            Live on menu
          </p>
        )}
        {isRejected && (
          <p className="text-xs text-zinc-500 font-semibold flex items-center gap-1.5">
            <XIcon weight="bold" className="size-4" />
            Rejected
          </p>
        )}
      </div>
    </div>
  );
}

// ── Missed Opportunity Card ───────────────────────────────────────────────────
function MissedCard({ opp, onCreate }) {
  return (
    <div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
      <div className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="size-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
            <WarningCircleIcon weight="duotone" className="size-5 text-amber-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide">
              Customers frequently buy
            </p>
            <p className="text-sm font-bold text-foreground mt-0.5">
              {opp.itemAName} + {opp.itemBName}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              No combo exists · ordered together {opp.coOrderCount} times
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-amber-50 rounded-xl px-3 py-2 border border-amber-100">
            <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide mb-0.5">
              Revenue Lost
            </p>
            <p className="text-sm font-bold text-foreground">{fmtCur(opp.estimatedMissedRevenue)}/mo</p>
          </div>
          <div className="bg-emerald-50 rounded-xl px-3 py-2 border border-emerald-100">
            <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wide mb-0.5">
              Expected Uplift
            </p>
            <p className="text-sm font-bold text-foreground">+{opp.expectedUplift}%</p>
          </div>
        </div>
        <Button
          size="sm"
          className="w-full h-10 font-semibold gap-2"
          onClick={() => onCreate(opp)}
        >
          <SparkleIcon weight="bold" className="size-4" /> Create Combo
        </Button>
      </div>
    </div>
  );
}

// ── Approval Workflow Banner ──────────────────────────────────────────────────
function WorkflowBanner() {
  const steps = [
    { label: "Generated",     desc: "AI analysis",         color: "bg-zinc-200 text-zinc-700" },
    { label: "Pending Review",desc: "Admin reviews",        color: "bg-amber-100 text-amber-700" },
    { label: "Approved",      desc: "Ready to publish",     color: "bg-blue-100 text-blue-700" },
    { label: "Live on Menu",  desc: "Visible to customers", color: "bg-emerald-100 text-emerald-700" },
  ];

  return (
    <div className="mx-4 mb-4 rounded-2xl bg-zinc-50 border border-zinc-200 p-4">
      <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-3">
        Approval Workflow
      </p>
      <div className="flex items-center">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center min-w-0 flex-1">
              <div className={cn("size-7 rounded-full flex items-center justify-center text-[11px] font-bold", step.color)}>
                {i + 1}
              </div>
              <p className="text-[10px] font-semibold text-foreground mt-1 text-center leading-tight px-0.5">
                {step.label}
              </p>
              <p className="text-[9px] text-muted-foreground text-center leading-tight">
                {step.desc}
              </p>
            </div>
            {i < steps.length - 1 && (
              <div className="h-px w-3 bg-zinc-300 shrink-0 mb-5" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
function AdminComboOpportunitiesPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("PENDING_REVIEW");
  const [editTarget, setEditTarget] = useState(null);
  const [analysisRunning, setAnalysisRunning] = useState(false);

  const { data: opportunities = [], isLoading } = useQuery(comboOpportunitiesOptions());
  const { data: missed = [], isLoading: missedLoading } = useQuery(missedOpportunitiesOptions);

  const reviewMutation = useMutation({
    mutationFn: ({ id, action }) => reviewComboOpportunity(id, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["combo-opportunities"] });
      toast.success("Opportunity updated");
    },
    onError: () => toast.error("Failed to update"),
  });

  const handleRunAnalysis = async () => {
    setAnalysisRunning(true);
    try {
      await triggerComboAnalysis();
      queryClient.invalidateQueries({ queryKey: ["combo-opportunities"] });
      toast.success("AI analysis started! Results will appear shortly.");
    } catch {
      toast.error("Failed to start analysis");
    } finally {
      setAnalysisRunning(false);
    }
  };

  const counts = useMemo(
    () => ({
      PENDING_REVIEW: opportunities.filter((o) => o.status === "PENDING_REVIEW").length,
      APPROVED:       opportunities.filter((o) => o.status === "APPROVED").length,
      LIVE:           opportunities.filter((o) => o.status === "LIVE").length,
      REJECTED:       opportunities.filter((o) => o.status === "REJECTED").length,
    }),
    [opportunities],
  );

  const filtered = useMemo(
    () =>
      tab === "ALL" ? opportunities : opportunities.filter((o) => o.status === tab),
    [opportunities, tab],
  );

  const TABS = [
    { value: "PENDING_REVIEW", label: "Pending Review", count: counts.PENDING_REVIEW },
    { value: "LIVE",           label: "Live",           count: counts.LIVE },
    { value: "APPROVED",       label: "Approved",       count: counts.APPROVED },
    { value: "REJECTED",       label: "Rejected",       count: counts.REJECTED },
    { value: "ALL",            label: "All",            count: opportunities.length },
  ];

  const totalMissed = missed.reduce((sum, o) => sum + (o.estimatedMissedRevenue ?? 0), 0);

  return (
    <>
      {/* ── Page header ── */}
      <AdminHeader
        title="Combo Opportunities"
        description="AI-generated combo suggestions from order co-occurrence analysis. Review and publish to go live on the menu."
        actions={
          <Button onClick={handleRunAnalysis} disabled={analysisRunning} className="h-10 gap-2">
            <SparkleIcon weight="bold" className="size-4" />
            {analysisRunning ? "Analysing…" : "Run AI Analysis"}
          </Button>
        }
      />

      {/* ── Status chips ── */}
      <div className="px-4 pb-3 flex gap-2 flex-wrap">
        {[
          { label: "Suggested Combos",  count: opportunities.length,    cls: "bg-zinc-100 text-zinc-700" },
          { label: "Pending Review",    count: counts.PENDING_REVIEW,    cls: "bg-amber-50 text-amber-700" },
          { label: "Live",              count: counts.LIVE,              cls: "bg-emerald-50 text-emerald-700" },
          { label: "Rejected",          count: counts.REJECTED,          cls: "bg-red-50 text-red-600" },
        ].map(({ label, count, cls }) => (
          <div
            key={label}
            className={cn("inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold", cls)}
          >
            {label} <span className="font-bold">({count})</span>
          </div>
        ))}
      </div>

      {/* ── Approval workflow banner ── */}
      <WorkflowBanner />

      {/* ── Tabs ── */}
      <div className="px-4 pb-4 flex gap-1.5 overflow-x-auto no-scrollbar">
        {TABS.map(({ value, label, count }) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={cn(
              "flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
              tab === value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-zinc-100",
            )}
          >
            {label}
            {count > 0 && (
              <span className="ml-1.5 text-xs opacity-80">({count})</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Loading skeletons ── */}
      {isLoading && (
        <div className="px-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-96 bg-zinc-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      )}

      {/* ── Empty state ── */}
      {!isLoading && opportunities.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <div className="size-14 bg-primary/8 rounded-2xl flex items-center justify-center mb-4">
            <SparkleIcon weight="duotone" className="size-7 text-primary" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-1.5">
            No Combo Opportunities Yet
          </h3>
          <p className="text-sm text-muted-foreground max-w-xs mb-5 leading-relaxed">
            Run AI analysis to discover high-value combo opportunities from your
            order history.
          </p>
          <Button onClick={handleRunAnalysis} disabled={analysisRunning} className="h-11 gap-2">
            <SparkleIcon weight="bold" className="size-4" />
            {analysisRunning ? "Running…" : "Run AI Analysis"}
          </Button>
        </div>
      )}

      {/* ── Empty filtered tab state ── */}
      {!isLoading && opportunities.length > 0 && filtered.length === 0 && (
        <div className="py-12 px-6 text-center">
          <p className="text-sm text-muted-foreground">
            No opportunities with status &quot;{tab.replace("_", " ")}&quot;.
          </p>
        </div>
      )}

      {/* ── Opportunity cards grid ── */}
      {!isLoading && filtered.length > 0 && (
        <div className="px-4 pb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((o) => (
            <OpportunityCard
              key={o.id}
              opportunity={o}
              onEdit={setEditTarget}
              onApprove={(id) => reviewMutation.mutate({ id, action: "APPROVE" })}
              onReject={(id) => reviewMutation.mutate({ id, action: "REJECT" })}
              submitting={reviewMutation.isPending}
            />
          ))}
        </div>
      )}

      {/* ── Missed Combo Opportunities section ── */}
      {!missedLoading && missed.length > 0 && (
        <div className="px-4 pb-10">
          {/* Divider with title */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-zinc-200" />
            <div className="flex items-center gap-2">
              <WarningCircleIcon weight="duotone" className="size-4 text-amber-500" />
              <span className="text-sm font-semibold text-foreground whitespace-nowrap">
                Missed Combo Opportunities
              </span>
            </div>
            <div className="flex-1 h-px bg-zinc-200" />
          </div>

          {/* Revenue lost summary */}
          {totalMissed > 0 && (
            <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
              <p className="text-xs text-amber-700 font-medium">Potential Revenue Lost</p>
              <p className="text-base font-bold text-amber-800 tabular-nums">
                {fmtCur(totalMissed)}/month
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {missed.map((opp) => (
              <MissedCard
                key={opp.id}
                opp={opp}
                onCreate={(o) =>
                  toast.info(`Create a combo for "${o.itemAName} + ${o.itemBName}"`)
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Edit drawer ── */}
      <EditComboOpportunityDrawer
        opportunity={editTarget}
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ["combo-opportunities"] });
          setEditTarget(null);
        }}
      />
    </>
  );
}

