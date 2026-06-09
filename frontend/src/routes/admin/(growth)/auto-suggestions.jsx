import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { autoSuggestionsOptions } from "@/query/options/recommendations";
import {
  reviewSuggestion,
  bulkReviewSuggestions,
  triggerCoOccurrenceScheduler,
} from "@/services/recommendation-service";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  CheckIcon, XIcon, PlayIcon, CheckSquareIcon, MagicWandIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/(growth)/auto-suggestions")({
  component: AdminAutoSuggestionsPage,
});

function confidenceColor(conf) {
  if (conf >= 0.6) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (conf >= 0.4) return "bg-amber-50  text-amber-700  border-amber-200";
  return "bg-zinc-100 text-zinc-600 border-zinc-200";
}

function StatusPill({ status }) {
  if (status === "ACCEPTED")
    return <span className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">Accepted</span>;
  if (status === "REJECTED")
    return <span className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-red-50 text-red-600 border-red-200">Rejected</span>;
  return <span className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-zinc-100 text-zinc-600 border-zinc-200">Pending</span>;
}

// Mobile card for a single suggestion
function SuggestionCard({ s, selected, onToggleSelect, onAccept, onReject, pending }) {
  const isPending = s.status === "PENDING";
  return (
    <div className={cn(
      "bg-white rounded-2xl border p-4 space-y-3 shadow-sm transition-colors",
      selected ? "border-primary/40 bg-primary/3" : "border-border",
    )}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          {isPending && (
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onToggleSelect(s.id)}
              className="size-4 mt-0.5 accent-primary cursor-pointer shrink-0"
            />
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{s.itemAName}</p>
            <p className="text-xs text-muted-foreground mt-0.5">→ suggest <span className="font-medium text-foreground">{s.itemBName}</span></p>
          </div>
        </div>
        <StatusPill status={s.status} />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-zinc-50 rounded-xl px-3 py-2">
          <p className="text-[10px] text-zinc-400 uppercase tracking-wide font-semibold mb-0.5">Confidence</p>
          <span className={cn("inline-flex items-center text-xs font-bold px-2 py-0.5 rounded-full border", confidenceColor(s.confidence))}>
            {(s.confidence * 100).toFixed(0)}%
          </span>
        </div>
        <div className="bg-zinc-50 rounded-xl px-3 py-2">
          <p className="text-[10px] text-zinc-400 uppercase tracking-wide font-semibold mb-0.5">Co-orders</p>
          <p className="text-sm font-bold text-foreground">{s.coCount}</p>
        </div>
      </div>

      {/* Actions */}
      {isPending && (
        <div className="flex gap-2 pt-1 border-t border-zinc-100">
          <Button
            size="sm" variant="outline"
            className="flex-1 h-10 text-emerald-700 border-emerald-200 hover:bg-emerald-50 font-semibold"
            onClick={() => onAccept(s.id)}
            disabled={pending}
          >
            <CheckIcon className="size-4 mr-1" weight="bold" /> Accept
          </Button>
          <Button
            size="sm" variant="outline"
            className="flex-1 h-10 text-destructive border-destructive/30 hover:bg-destructive/5 font-semibold"
            onClick={() => onReject(s.id)}
            disabled={pending}
          >
            <XIcon className="size-4 mr-1" weight="bold" /> Reject
          </Button>
        </div>
      )}
      {s.reviewedBy && (
        <p className="text-xs text-muted-foreground">Reviewed by {s.reviewedBy}</p>
      )}
    </div>
  );
}

function AdminAutoSuggestionsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [selected, setSelected] = useState(new Set());
  const [schedulerRunning, setSchedulerRunning] = useState(false);

  const { data: suggestions = [], isLoading } = useQuery(autoSuggestionsOptions);

  const reviewMutation = useMutation({
    mutationFn: ({ id, action }) => reviewSuggestion(id, action),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["growth", "suggestions"] }),
  });

  const bulkMutation = useMutation({
    mutationFn: ({ ids, action }) => bulkReviewSuggestions(ids, action),
    onSuccess: () => {
      setSelected(new Set());
      queryClient.invalidateQueries({ queryKey: ["growth", "suggestions"] });
    },
  });

  const handleRunScheduler = async () => {
    setSchedulerRunning(true);
    try {
      await triggerCoOccurrenceScheduler();
      queryClient.invalidateQueries({ queryKey: ["growth", "suggestions"] });
    } catch (e) {
      console.error(e);
    } finally {
      setSchedulerRunning(false);
    }
  };

  const filtered = statusFilter === "ALL"
    ? suggestions
    : suggestions.filter(s => s.status === statusFilter);

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAllPending = () => {
    const pendingIds = filtered.filter(s => s.status === "PENDING").map(s => s.id);
    setSelected(new Set(pendingIds));
  };

  const skeletonRows = Array.from({ length: 4 });

  return (
    <>
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="px-4 pt-6 pb-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-[28px] leading-tight">
            Auto Suggestions
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground max-w-md">
            System-detected item pairings from order history. Review each before it goes live.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap shrink-0">
          <Button variant="outline" onClick={handleRunScheduler} disabled={schedulerRunning} className="h-11 gap-2">
            <PlayIcon weight="bold" className="size-4" />
            {schedulerRunning ? "Running…" : "Run Analysis"}
          </Button>
          {selected.size > 0 && (
            <>
              <Button
                className="h-11 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white border-0"
                onClick={() => bulkMutation.mutate({ ids: [...selected], action: "ACCEPT" })}
                disabled={bulkMutation.isPending}
              >
                <CheckIcon weight="bold" className="size-4" /> Accept {selected.size}
              </Button>
              <Button
                variant="destructive"
                className="h-11 gap-2"
                onClick={() => bulkMutation.mutate({ ids: [...selected], action: "REJECT" })}
                disabled={bulkMutation.isPending}
              >
                <XIcon weight="bold" className="size-4" /> Reject {selected.size}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── Toolbar ──────────────────────────────────────────────────────────── */}
      <div className="px-4 pb-4 flex items-center gap-3 flex-wrap">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="ACCEPTED">Accepted</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
            <SelectItem value="ALL">All</SelectItem>
          </SelectContent>
        </Select>
        {statusFilter === "PENDING" && filtered.length > 0 && (
          <Button variant="ghost" size="sm" onClick={selectAllPending} className="gap-1.5 text-xs">
            <CheckSquareIcon className="size-4" /> Select all
          </Button>
        )}
        <span className="text-xs text-muted-foreground ml-auto tabular-nums">{filtered.length} suggestions</span>
      </div>

      {/* ── Loading skeletons ────────────────────────────────────────────────── */}
      {isLoading && (
        <div className="px-4 space-y-3">
          {skeletonRows.map((_, i) => (
            <div key={i} className="h-32 bg-zinc-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      )}

      {/* ── Empty state ──────────────────────────────────────────────────────── */}
      {!isLoading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <div className="size-14 bg-primary/8 rounded-2xl flex items-center justify-center mb-4">
            <MagicWandIcon weight="duotone" className="size-7 text-primary" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-1.5">
            {statusFilter === "PENDING" ? "No Pending Suggestions" : "No Suggestions Found"}
          </h3>
          <p className="text-sm text-muted-foreground max-w-xs mb-5">
            {statusFilter === "PENDING"
              ? "Click 'Run Analysis' to analyse your order history for item co-occurrence patterns."
              : "No suggestions match the selected filter."}
          </p>
          {statusFilter === "PENDING" && (
            <Button onClick={handleRunScheduler} disabled={schedulerRunning} className="h-11 gap-2">
              <PlayIcon weight="bold" className="size-4" />
              {schedulerRunning ? "Running…" : "Run Analysis"}
            </Button>
          )}
        </div>
      )}

      {/* ── Mobile cards (< md) ──────────────────────────────────────────────── */}
      {!isLoading && filtered.length > 0 && (
        <div className="px-4 pb-8 space-y-3 md:hidden">
          {filtered.map((s) => (
            <SuggestionCard
              key={s.id}
              s={s}
              selected={selected.has(s.id)}
              onToggleSelect={toggleSelect}
              onAccept={(id) => reviewMutation.mutate({ id, action: "ACCEPT" })}
              onReject={(id) => reviewMutation.mutate({ id, action: "REJECT" })}
              pending={reviewMutation.isPending}
            />
          ))}
        </div>
      )}

      {/* ── Desktop table (≥ md) ─────────────────────────────────────────────── */}
      {!isLoading && filtered.length > 0 && (
        <div className="px-4 pb-8 hidden md:block">
          <div className="rounded-2xl border border-border overflow-hidden bg-white shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-zinc-50/80 hover:bg-zinc-50/80 border-b border-zinc-200">
                  <TableHead className="w-8" />
                  <TableHead className="font-semibold text-zinc-700 text-xs uppercase tracking-wide">If customer orders…</TableHead>
                  <TableHead className="font-semibold text-zinc-700 text-xs uppercase tracking-wide">Also suggest…</TableHead>
                  <TableHead className="w-32 text-center font-semibold text-zinc-700 text-xs uppercase tracking-wide">Confidence</TableHead>
                  <TableHead className="w-24 text-center font-semibold text-zinc-700 text-xs uppercase tracking-wide">Co-orders</TableHead>
                  <TableHead className="w-24 text-center font-semibold text-zinc-700 text-xs uppercase tracking-wide">Status</TableHead>
                  <TableHead className="w-36 text-center font-semibold text-zinc-700 text-xs uppercase tracking-wide">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(s => (
                  <TableRow key={s.id} className={cn("hover:bg-zinc-50/60 transition-colors", selected.has(s.id) && "bg-primary/3")}>
                    <TableCell>
                      {s.status === "PENDING" && (
                        <input
                          type="checkbox"
                          checked={selected.has(s.id)}
                          onChange={() => toggleSelect(s.id)}
                          className="size-4 accent-primary cursor-pointer"
                        />
                      )}
                    </TableCell>
                    <TableCell className="font-medium text-sm">{s.itemAName}</TableCell>
                    <TableCell className="text-sm">{s.itemBName}</TableCell>
                    <TableCell className="text-center">
                      <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border", confidenceColor(s.confidence))}>
                        {(s.confidence * 100).toFixed(0)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-center text-sm text-muted-foreground tabular-nums">{s.coCount}</TableCell>
                    <TableCell className="text-center"><StatusPill status={s.status} /></TableCell>
                    <TableCell className="text-center">
                      {s.status === "PENDING" ? (
                        <div className="flex gap-1 justify-center">
                          <Button
                            size="sm" variant="outline"
                            className="text-emerald-700 border-emerald-200 hover:bg-emerald-50 h-8 px-3 text-xs font-semibold"
                            onClick={() => reviewMutation.mutate({ id: s.id, action: "ACCEPT" })}
                            disabled={reviewMutation.isPending}
                          >
                            <CheckIcon className="size-3 mr-1" weight="bold" /> Accept
                          </Button>
                          <Button
                            size="sm" variant="outline"
                            className="text-destructive border-destructive/30 hover:bg-destructive/5 h-8 px-3 text-xs font-semibold"
                            onClick={() => reviewMutation.mutate({ id: s.id, action: "REJECT" })}
                            disabled={reviewMutation.isPending}
                          >
                            <XIcon className="size-3 mr-1" weight="bold" /> Reject
                          </Button>
                        </div>
                      ) : s.reviewedBy ? (
                        <span className="text-xs text-muted-foreground">by {s.reviewedBy}</span>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </>
  );
}
