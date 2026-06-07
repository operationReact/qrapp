import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  AlertTriangle,
  Lightbulb,
  Star,
  Target,
  PencilLine,
  ChevronDown,
  ChevronUp,
  X,
  Tag,
} from "lucide-react";
import MetricCard from "@/components/analytics/MetricCard";
import ChartContainer from "@/components/analytics/ChartContainer";
import AnalyticsPageHeader from "@/components/analytics/AnalyticsPageHeader";
import AnalyticsTable from "@/components/analytics/AnalyticsTable";
import OrdersBarChart from "@/components/charts/OrdersBarChart";
import { EmptyState } from "@/components/analytics/States";
import {
  useProfitabilityDashboard,
  useMostProfitableItems,
  useHighestMarginItems,
} from "@/hooks/useAnalytics";
import { updateItemEstimatedCost, updateItemSellingPrice } from "@/services/analyticsService";
import { cn } from "@/lib/utils";

const TODAY = new Date().toISOString().slice(0, 10);
const THIRTY_DAYS_AGO = new Date(new Date().setDate(new Date().getDate() - 29))
  .toISOString()
  .slice(0, 10);

const fmtCurrency = (n) =>
  n != null && !isNaN(Number(n))
    ? new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(Number(n))
    : "—";

const fmtMargin = (n) =>
  n != null && !isNaN(Number(n)) ? `${Number(n).toFixed(1)}%` : "—";

const insightColors = {
  LOW_MARGIN_HIGH_VOLUME: "border-amber-300 bg-amber-50",
  HIGH_MARGIN_LOW_VOLUME: "border-emerald-300 bg-emerald-50",
  MISSING_COST:           "border-zinc-200 bg-zinc-50",
  HEALTHY_MARGIN:         "border-emerald-300 bg-emerald-50",
  THIN_MARGIN:            "border-red-300 bg-red-50",
};

const insightIcons = {
  LOW_MARGIN_HIGH_VOLUME: <TrendingDown size={14} className="text-amber-500 shrink-0 mt-0.5" />,
  HIGH_MARGIN_LOW_VOLUME: <Star size={14} className="text-emerald-500 shrink-0 mt-0.5" />,
  MISSING_COST:           <AlertTriangle size={14} className="text-zinc-400 shrink-0 mt-0.5" />,
  HEALTHY_MARGIN:         <TrendingUp size={14} className="text-emerald-500 shrink-0 mt-0.5" />,
  THIN_MARGIN:            <AlertTriangle size={14} className="text-red-500 shrink-0 mt-0.5" />,
};

// ── Small item image avatar with letter fallback ─────────────────────────────
function ItemAvatar({ imageUrl, name, className = "w-9 h-9" }) {
  return imageUrl ? (
    <img
      src={imageUrl}
      alt={name}
      className={cn("rounded-lg object-cover shrink-0", className)}
      onError={(e) => { e.currentTarget.style.display = "none"; }}
    />
  ) : (
    <div className={cn("rounded-lg bg-zinc-200 flex items-center justify-center shrink-0", className)}>
      <span className="text-[11px] font-bold text-zinc-500 uppercase">{name?.[0] ?? "?"}</span>
    </div>
  );
}

// ── Collapsible insight group (Hidden Gems / global banners) ─────────────────
function InsightGroup({ title, subtitle, icon, badgeClass, insights, defaultOpen = true, footer }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-zinc-50 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="shrink-0">{icon}</span>
          <div className="min-w-0">
            <span className="text-sm font-semibold text-zinc-800 block truncate">{title}</span>
            {subtitle && <span className="text-xs text-zinc-500 block truncate">{subtitle}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded-full", badgeClass)}>
            {insights.length}
          </span>
          {open ? <ChevronUp size={15} className="text-zinc-400" /> : <ChevronDown size={15} className="text-zinc-400" />}
        </div>
      </button>
      {open && (
        <div className="px-3 pb-3 border-t border-zinc-100">
          <div className="pt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {insights.map((insight, i) => (
              <div
                key={i}
                className={cn("rounded-lg border p-3 flex gap-2.5 items-start", insightColors[insight.type] ?? "border-zinc-200 bg-zinc-50")}
              >
                <ItemAvatar imageUrl={insight.imageUrl} name={insight.itemName} className="w-9 h-9 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-zinc-800 leading-snug">{insight.title}</p>
                  <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{insight.message}</p>
                </div>
              </div>
            ))}
          </div>
          {footer && <div className="mt-3 pt-3 border-t border-zinc-100">{footer}</div>}
        </div>
      )}
    </div>
  );
}

// ── Pricing-opportunity group ────────────────────────────────────────────────
function PricingOpportunityGroup({ insights, onPriceSaved }) {
  const [open, setOpen] = useState(true);
  const [priceValues, setPriceValues] = useState({});
  const [saving, setSaving]           = useState(null);
  const [savedIds, setSavedIds]       = useState({});

  const handleSave = async (itemId) => {
    const raw = priceValues[itemId];
    const val = parseFloat(raw);
    if (!raw || isNaN(val) || val <= 0) return;
    setSaving(itemId);
    try {
      await updateItemSellingPrice(itemId, val);
      setSavedIds((prev) => ({ ...prev, [itemId]: true }));
      setTimeout(() => {
        setSavedIds((prev) => { const n = { ...prev }; delete n[itemId]; return n; });
        onPriceSaved?.();
      }, 1200);
    } catch (e) {
      console.error("Failed to update selling price", e);
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="rounded-xl border border-amber-200 bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-amber-50/50 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <TrendingDown size={15} className="text-amber-500 shrink-0" />
          <div className="min-w-0">
            <span className="text-sm font-semibold text-zinc-800 block truncate">Pricing Opportunities</span>
            <span className="text-xs text-zinc-500 block truncate">High-volume items with low margin — update price right here</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{insights.length}</span>
          {open ? <ChevronUp size={15} className="text-zinc-400" /> : <ChevronDown size={15} className="text-zinc-400" />}
        </div>
      </button>
      {open && (
        <div className="px-3 pb-3 border-t border-amber-100">
          <div className="pt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {insights.map((insight, i) => {
              const itemId   = insight.menuItemId;
              const priceVal = priceValues[itemId] ?? "";
              const isSaving = saving === itemId;
              const isSaved  = !!savedIds[itemId];
              return (
                <div key={i} className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex flex-col gap-2">
                  {/* Item header with image */}
                  <div className="flex gap-2.5 items-center">
                    <ItemAvatar imageUrl={insight.imageUrl} name={insight.itemName} className="w-9 h-9 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-zinc-800 leading-snug truncate">{insight.title}</p>
                      <p className="text-[11px] text-zinc-500 leading-relaxed line-clamp-2">{insight.message}</p>
                    </div>
                  </div>
                  {/* current → new price row */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {insight.sellingPrice != null && (
                      <>
                        <span className="text-xs font-semibold text-zinc-700 bg-white border border-zinc-200 rounded px-1.5 py-0.5">
                          {fmtCurrency(insight.sellingPrice)}
                        </span>
                        <span className="text-zinc-400 text-xs">→</span>
                      </>
                    )}
                    <span className="text-xs text-zinc-400">₹</span>
                    <input
                      type="number" min="0.01" step="1" value={priceVal}
                      onChange={(e) => setPriceValues((prev) => ({ ...prev, [itemId]: e.target.value }))}
                      onKeyDown={(e) => e.key === "Enter" && handleSave(itemId)}
                      placeholder="New price"
                      className="border border-amber-300 rounded-md px-2 py-1.5 text-xs w-24 bg-white focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                    <button
                      disabled={isSaving || !priceVal || isSaved}
                      onClick={() => handleSave(itemId)}
                      className={cn(
                        "text-[11px] font-semibold px-3 py-1.5 rounded-md whitespace-nowrap transition-colors disabled:opacity-50",
                        isSaved ? "bg-emerald-500 text-white" : "bg-amber-500 text-white"
                      )}
                    >
                      {isSaving ? "…" : isSaved ? "✓ Updated" : "Update"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Missing-cost group ───────────────────────────────────────────────────────
function MissingCostGroup({ insights, onCostSaved }) {
  const [open, setOpen] = useState(false);
  const [costValues, setCostValues] = useState({});
  const [saving, setSaving]         = useState(null);
  const [savedIds, setSavedIds]     = useState({});

  const handleSave = async (itemId) => {
    const raw = costValues[itemId];
    const val = parseFloat(raw);
    if (!raw || isNaN(val) || val < 0) return;
    setSaving(itemId);
    try {
      await updateItemEstimatedCost(itemId, val);
      setSavedIds((prev) => ({ ...prev, [itemId]: true }));
      setTimeout(() => {
        setSavedIds((prev) => { const n = { ...prev }; delete n[itemId]; return n; });
        onCostSaved?.();
      }, 1200);
    } catch (e) {
      console.error("Failed to save estimated cost", e);
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-zinc-50 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <AlertTriangle size={15} className="text-zinc-400 shrink-0" />
          <div className="min-w-0">
            <span className="text-sm font-semibold text-zinc-800 block truncate">Missing Cost Data</span>
            <span className="text-xs text-zinc-500 block truncate">Set estimated cost right here — profit cannot be calculated without it</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600">{insights.length}</span>
          {open ? <ChevronUp size={15} className="text-zinc-400" /> : <ChevronDown size={15} className="text-zinc-400" />}
        </div>
      </button>
      {open && (
        <div className="px-3 pb-3 border-t border-zinc-100">
          <div className="pt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {insights.map((insight, i) => {
              const itemId  = insight.menuItemId;
              const costVal = costValues[itemId] ?? "";
              const isSaving = saving === itemId;
              const isSaved  = !!savedIds[itemId];
              return (
                <div key={i} className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 flex flex-col gap-2">
                  <div className="flex gap-2.5 items-center">
                    <ItemAvatar imageUrl={insight.imageUrl} name={insight.itemName} className="w-9 h-9 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-zinc-800 leading-snug truncate">{insight.title}</p>
                      {insight.sellingPrice != null && (
                        <p className="text-[11px] text-zinc-500 mt-0.5">
                          Sells for <span className="font-semibold text-zinc-700">{fmtCurrency(insight.sellingPrice)}</span>
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-zinc-400">₹</span>
                    <input
                      type="number" min="0" step="0.50" value={costVal}
                      onChange={(e) => setCostValues((prev) => ({ ...prev, [itemId]: e.target.value }))}
                      onKeyDown={(e) => e.key === "Enter" && handleSave(itemId)}
                      placeholder="Cost / unit"
                      className="border border-zinc-300 rounded-md px-2 py-1.5 text-xs w-28 bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <button
                      disabled={isSaving || !costVal || isSaved}
                      onClick={() => handleSave(itemId)}
                      className={cn(
                        "text-[11px] font-semibold px-3 py-1.5 rounded-md whitespace-nowrap transition-colors disabled:opacity-50",
                        isSaved ? "bg-emerald-500 text-white" : "bg-primary text-white"
                      )}
                    >
                      {isSaving ? "…" : isSaved ? "✓ Saved" : "Save"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute("/admin/analytics/profitability")({
  component: ProfitabilityPage,
});

function ProfitabilityPage() {
  const [from, setFrom] = useState(THIRTY_DAYS_AGO);
  const [to, setTo] = useState(TODAY);
  const [editingCostId, setEditingCostId] = useState(null);
  const [editCostValue, setEditCostValue] = useState("");
  const [costSaving, setCostSaving] = useState(false);

  const params = { from, to };
  const dashboard   = useProfitabilityDashboard(params);
  const profitItems = useMostProfitableItems({ ...params, limit: 15 });
  const marginItems = useHighestMarginItems({ ...params, limit: 15 });

  const d          = dashboard.data ?? {};
  const profitRows = Array.isArray(profitItems.data) ? profitItems.data : [];
  const marginRows = Array.isArray(marginItems.data) ? marginItems.data : [];
  const insights   = Array.isArray(d.insights) ? d.insights : [];

  const globalInsights       = insights.filter((i) => i.type === "HEALTHY_MARGIN" || i.type === "THIN_MARGIN");
  const pricingOpportunities = insights.filter((i) => i.type === "LOW_MARGIN_HIGH_VOLUME");
  const hiddenGems           = insights.filter((i) => i.type === "HIGH_MARGIN_LOW_VOLUME");
  const missingCosts         = insights.filter((i) => i.type === "MISSING_COST");

  const refetchAll = () => { dashboard.refetch(); profitItems.refetch(); marginItems.refetch(); };

  const profitChartData = profitRows.slice(0, 10).map((r) => ({ name: r.menuItemName ?? r.name, profit: Number(r.totalProfit ?? 0), revenue: Number(r.totalRevenue ?? 0) }));
  const marginChartData = marginRows.slice(0, 10).map((r) => ({ name: r.menuItemName ?? r.name, margin: Number(r.avgProfitMargin ?? 0) }));

  const kpiCards = [
    { title: "Total Revenue",    value: fmtCurrency(d.totalRevenue),        icon: <DollarSign size={14} /> },
    { title: "Estimated Cost",   value: fmtCurrency(d.totalEstimatedCost),  icon: <BarChart3 size={14} /> },
    { title: "Estimated Profit", value: fmtCurrency(d.totalEstimatedProfit),icon: <TrendingUp size={14} /> },
    { title: "Avg Margin",       value: fmtMargin(d.avgProfitMargin),        icon: <Target size={14} /> },
  ];

  // Profitability table — Cost cell handles its own inline editing
  const profitColumns = [
    { key: "rank",            header: "#",       render: (_, _row, i) => <span className="text-zinc-400 font-medium text-xs">#{i + 1}</span> },
    { key: "menuItemName",    header: "Item",    render: (v, row) => (
      <div className="flex items-center gap-2 min-w-0">
        <ItemAvatar imageUrl={row.imageUrl} name={v} className="w-7 h-7 shrink-0" />
        <span className="truncate text-xs font-medium">{v}</span>
      </div>
    )},
    { key: "totalQtySold",    header: "Qty",        render: (v) => <span className="text-xs">{Number(v).toLocaleString("en-IN")}</span> },
    { key: "totalRevenue",    header: "Revenue",    render: (v) => <span className="text-xs">{fmtCurrency(v)}</span> },
    { key: "avgSellingPrice", header: "Sell Price", render: (v, row) => {
      // Use avgSellingPrice from analytics; fall back to revenue ÷ qty
      const sp = v != null && Number(v) > 0
        ? Number(v)
        : Number(row.totalQtySold) > 0
          ? Number(row.totalRevenue) / Number(row.totalQtySold)
          : null;
      return sp != null
        ? <span className="text-xs font-semibold text-primary">{fmtCurrency(sp)}</span>
        : <span className="text-zinc-400 text-xs">—</span>;
    }},
    { key: "totalCost",       header: "Cost",    render: (v, row, i) => {
      const itemId    = row.menuItemId;
      const rowKey    = `${itemId}_${i}`;
      const isEditing = editingCostId === rowKey;
      const isSaving  = costSaving && editingCostId === rowKey;
      const hasCost   = v != null && Number(v) > 0;
      const perUnit   = hasCost && Number(row.totalQtySold) > 0
        ? Number(v) / Number(row.totalQtySold)
        : 0;

      // Best available selling price — always shown for context
      const sellPrice =
        row.avgSellingPrice != null && Number(row.avgSellingPrice) > 0
          ? Number(row.avgSellingPrice)
          : Number(row.totalQtySold) > 0
            ? Number(row.totalRevenue) / Number(row.totalQtySold)
            : null;

      // ── EDITING STATE ──────────────────────────────────────────────────
      if (isEditing) {
        const entered    = parseFloat(editCostValue);
        const liveMargin = !isNaN(entered) && entered > 0 && sellPrice > 0
          ? (((sellPrice - entered) / sellPrice) * 100)
          : null;
        const marginColor =
          liveMargin === null    ? ""
          : liveMargin >= 50     ? "bg-emerald-100 text-emerald-700 border-emerald-200"
          : liveMargin >= 25     ? "bg-amber-100 text-amber-700 border-amber-200"
          :                        "bg-red-100 text-red-600 border-red-200";

        return (
          <div className="flex flex-col gap-1.5 py-1 min-w-[170px]">
            {/* Selling price + live margin */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <div className="flex items-center gap-1 bg-zinc-100 rounded-full px-2 py-0.5">
                <Tag size={9} className="text-zinc-400" />
                <span className="text-[10px] font-semibold text-zinc-600">{fmtCurrency(sellPrice)}</span>
              </div>
              {liveMargin !== null && (
                <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full border", marginColor)}>
                  {liveMargin.toFixed(1)}% margin
                </span>
              )}
            </div>
            {/* Styled input group */}
            <div className="flex items-center gap-1.5">
              <div className="flex items-center border-2 border-primary/40 rounded-lg overflow-hidden bg-white focus-within:border-primary transition-colors">
                <span className="text-[11px] text-zinc-400 px-1.5 bg-zinc-50 border-r border-zinc-200 self-stretch flex items-center">₹</span>
                <input
                  autoFocus
                  type="number" min="0" step="0.50"
                  value={editCostValue}
                  onChange={(e) => setEditCostValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveCost(itemId);
                    if (e.key === "Escape") setEditingCostId(null);
                  }}
                  placeholder="cost / unit"
                  className="text-xs px-2 py-1.5 w-24 focus:outline-none bg-white"
                />
              </div>
              <button
                disabled={isSaving || !editCostValue}
                onClick={() => handleSaveCost(itemId)}
                className="text-[11px] font-bold text-white bg-primary hover:bg-primary/90 px-2.5 py-1.5 rounded-lg disabled:opacity-40 transition-colors whitespace-nowrap shadow-sm"
              >
                {isSaving ? "…" : "Save"}
              </button>
              <button onClick={() => setEditingCostId(null)}
                className="p-1 rounded-md text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors">
                <X size={13} />
              </button>
            </div>
          </div>
        );
      }

      // ── NO COST SET ────────────────────────────────────────────────────
      if (!hasCost) {
        return (
          <div className="flex flex-col gap-1.5">
            {/* Selling price — always visible */}
            {sellPrice != null && (
              <div className="flex items-center gap-1">
                <Tag size={9} className="text-zinc-400 shrink-0" />
                <span className="text-[11px] font-semibold text-zinc-600">{fmtCurrency(sellPrice)}</span>
                <span className="text-[10px] text-zinc-400">selling</span>
              </div>
            )}
            {/* Set cost CTA */}
            <button
              onClick={() => { setEditingCostId(rowKey); setEditCostValue(""); }}
              className="group inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg px-2.5 py-1 hover:from-amber-100 hover:to-orange-100 hover:border-amber-300 hover:shadow-sm transition-all"
            >
              <PencilLine size={10} className="group-hover:rotate-12 transition-transform" />
              Set cost
            </button>
          </div>
        );
      }

      // ── HAS COST ──────────────────────────────────────────────────────
      const margin = sellPrice && perUnit > 0
        ? (((sellPrice - perUnit) / sellPrice) * 100)
        : null;
      const marginColor =
        margin === null  ? "bg-zinc-100 text-zinc-500"
        : margin >= 50   ? "bg-emerald-100 text-emerald-700"
        : margin >= 25   ? "bg-amber-100 text-amber-700"
        :                  "bg-red-100 text-red-600";

      return (
        <div className="flex flex-col gap-1 group/costcell">
          {/* Cost + margin badge */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-zinc-800">{fmtCurrency(v)}</span>
            {margin !== null && (
              <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full", marginColor)}>
                {margin.toFixed(0)}%
              </span>
            )}
            <button
              onClick={() => { setEditingCostId(rowKey); setEditCostValue(perUnit.toFixed(2)); }}
              className="ml-auto opacity-0 group-hover/costcell:opacity-100 text-zinc-400 hover:text-primary transition-all p-0.5 rounded"
              title="Edit cost"
            >
              <PencilLine size={11} />
            </button>
          </div>
          {/* Per-unit + selling price context */}
          <div className="text-[10px] text-zinc-400 leading-tight">
            ₹{perUnit.toFixed(0)}/unit · sells {fmtCurrency(sellPrice)}
          </div>
        </div>
      );
    }},
    { key: "totalProfit",     header: "Profit",  render: (v, row) => {
      if (!row.totalCost || Number(row.totalCost) === 0)
        return <span className="text-[11px] text-amber-500 font-medium italic">Set cost first</span>;
      const n = Number(v ?? 0);
      return <span className={cn("text-xs font-semibold", n >= 0 ? "text-emerald-600" : "text-red-500")}>{fmtCurrency(v)}</span>;
    }},
    { key: "avgProfitMargin", header: "Margin",  render: (v, row) => {
      if (!row.totalCost || Number(row.totalCost) === 0)
        return <span className="text-zinc-400 text-xs">—</span>;
      const n = Number(v ?? 0);
      return <span className={cn("text-xs font-semibold", n >= 50 ? "text-emerald-600" : n >= 25 ? "text-amber-500" : "text-red-500")}>{fmtMargin(v)}</span>;
    }},
  ];

  const handleSaveCost = async (itemId) => {
    if (costSaving) return;
    setCostSaving(true);
    try {
      await updateItemEstimatedCost(itemId, parseFloat(editCostValue) || 0);
      setEditingCostId(null);
      setEditCostValue("");
      refetchAll();
    } catch (e) {
      console.error("Failed to update estimated cost", e);
    } finally {
      setCostSaving(false);
    }
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4">

      <AnalyticsPageHeader
        title="Profitability"
        description="True profit and margin for every item — not just revenue."
      />

      {/* ── Date range — stacks on mobile ── */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs text-zinc-500 font-medium">From</label>
        <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)}
          className="border border-zinc-200 rounded-md px-2 py-1.5 text-sm bg-white flex-1 min-w-[130px]" />
        <label className="text-xs text-zinc-500 font-medium">To</label>
        <input type="date" value={to} min={from} max={TODAY} onChange={(e) => setTo(e.target.value)}
          className="border border-zinc-200 rounded-md px-2 py-1.5 text-sm bg-white flex-1 min-w-[130px]" />
      </div>

      {/* ── KPI strip: 2 cols on mobile, 4 on sm+ ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {kpiCards.map((c) => <MetricCard key={c.title} {...c} loading={dashboard.loading} />)}
      </div>

      {/* ── Charts — stacked on mobile, side-by-side on lg ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <ChartContainer title="Most Profitable Items" subtitle="By total estimated profit"
          loading={profitItems.loading} error={profitItems.error} onRetry={profitItems.refetch}>
          {profitChartData.length
            ? <OrdersBarChart data={profitChartData} xKey="name" dataKey="profit" color="#10b981" label="Profit (₹)" />
            : <EmptyState title="No profit data yet" description="Set estimated costs to see profit." />}
        </ChartContainer>
        <ChartContainer title="Highest Margin Items" subtitle="By profit margin %"
          loading={marginItems.loading} error={marginItems.error} onRetry={marginItems.refetch}>
          {marginChartData.length
            ? <OrdersBarChart data={marginChartData} xKey="name" dataKey="margin" color="#6366f1" label="Margin %" />
            : <EmptyState title="No margin data yet" description="Set estimated costs to calculate margins." />}
        </ChartContainer>
      </div>

      {/* ── Business Insights ── */}
      {insights.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Lightbulb size={16} className="text-amber-500 shrink-0" />
            <h3 className="text-sm font-semibold text-zinc-700">
              Business Insights
              <span className="ml-1.5 text-[11px] font-medium text-zinc-400">({insights.length})</span>
            </h3>
          </div>

          {/* Global margin banners */}
          {globalInsights.map((insight, i) => (
            <div key={i} className={cn("rounded-xl border p-3 sm:p-4 flex gap-3 items-start", insightColors[insight.type] ?? "border-zinc-200 bg-zinc-50")}>
              <div className="shrink-0 mt-0.5">{insightIcons[insight.type]}</div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-zinc-800 leading-snug">{insight.title}</p>
                <p className="text-xs text-zinc-600 mt-1 leading-relaxed">{insight.message}</p>
              </div>
            </div>
          ))}

          {pricingOpportunities.length > 0 && (
            <PricingOpportunityGroup insights={pricingOpportunities} onPriceSaved={refetchAll} />
          )}
          {hiddenGems.length > 0 && (
            <InsightGroup
              title="Hidden Gems" subtitle="High-margin items selling below potential — consider promoting them"
              icon={<Star size={15} className="text-emerald-500" />}
              badgeClass="bg-emerald-100 text-emerald-700"
              insights={hiddenGems} defaultOpen={false}
            />
          )}
          {missingCosts.length > 0 && (
            <MissingCostGroup insights={missingCosts} onCostSaved={refetchAll} />
          )}
        </div>
      )}

      {/* ── Profitability breakdown table — horizontally scrollable on mobile ── */}
      <ChartContainer
        title="Item Profitability Breakdown"
        subtitle="Revenue, cost, profit and margin per item"
        loading={profitItems.loading} error={profitItems.error} onRetry={profitItems.refetch}
      >
        {profitRows.length
          ? <div className="overflow-x-auto -mx-1"><AnalyticsTable columns={profitColumns} rows={profitRows} /></div>
          : <EmptyState title="No data available" description="Profitability data is populated after each sales snapshot." />}
      </ChartContainer>
    </div>
  );
}
