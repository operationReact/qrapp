import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { autoSuggestionsOptions } from "@/query/options/recommendations";
import {
  reviewSuggestion,
  bulkReviewSuggestions,
  triggerCoOccurrenceScheduler,
} from "@/services/recommendation-service";
import AdminHeader from "@/components/admin/AdminHeader";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CheckIcon, XIcon, PlayIcon, CheckSquareIcon } from "@phosphor-icons/react";

export const Route = createFileRoute("/admin/(growth)/auto-suggestions")({
  component: AdminAutoSuggestionsPage,
});

function confidenceColor(conf) {
  if (conf >= 0.6) return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (conf >= 0.4) return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-zinc-100 text-zinc-700 border-zinc-200";
}

function statusBadge(status) {
  if (status === "ACCEPTED") return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Accepted</Badge>;
  if (status === "REJECTED") return <Badge variant="destructive">Rejected</Badge>;
  return <Badge variant="outline">Pending</Badge>;
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

  return (
    <>
      <div className="flex px-4 pt-2 flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <AdminHeader
          title="Auto Suggestions"
          description="System-detected item pairings from order history. Review each before it goes live."
          className="px-0 pt-0"
        />
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={handleRunScheduler} disabled={schedulerRunning}>
            <PlayIcon className="size-4" />
            {schedulerRunning ? "Running…" : "Run Analysis"}
          </Button>
          {selected.size > 0 && (
            <>
              <Button
                variant="outline"
                className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                onClick={() => bulkMutation.mutate({ ids: [...selected], action: "ACCEPT" })}
                disabled={bulkMutation.isPending}
              >
                <CheckIcon className="size-4" /> Accept {selected.size}
              </Button>
              <Button
                variant="outline"
                className="border-destructive/40 text-destructive hover:bg-destructive/5"
                onClick={() => bulkMutation.mutate({ ids: [...selected], action: "REJECT" })}
                disabled={bulkMutation.isPending}
              >
                <XIcon className="size-4" /> Reject {selected.size}
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="px-4 space-y-4">
        <div className="flex items-center gap-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
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
            <Button variant="ghost" size="sm" onClick={selectAllPending}>
              <CheckSquareIcon className="size-4" /> Select all pending
            </Button>
          )}
          <span className="text-sm text-muted-foreground ml-auto">{filtered.length} suggestions</span>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>If customer orders…</TableHead>
                <TableHead>Also suggest…</TableHead>
                <TableHead className="w-32 text-center">Confidence</TableHead>
                <TableHead className="w-24 text-center">Co-orders</TableHead>
                <TableHead className="w-24 text-center">Status</TableHead>
                <TableHead className="w-36 text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
              )}
              {!isLoading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    {statusFilter === "PENDING"
                      ? "No pending suggestions. Click 'Run Analysis' to analyse order history."
                      : "No suggestions found."}
                  </TableCell>
                </TableRow>
              )}
              {filtered.map(s => (
                <TableRow key={s.id} className={selected.has(s.id) ? "bg-primary/5" : ""}>
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
                  <TableCell className="font-medium">{s.itemAName}</TableCell>
                  <TableCell>{s.itemBName}</TableCell>
                  <TableCell className="text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${confidenceColor(s.confidence)}`}>
                      {(s.confidence * 100).toFixed(0)}%
                    </span>
                  </TableCell>
                  <TableCell className="text-center text-sm text-muted-foreground">{s.coCount}</TableCell>
                  <TableCell className="text-center">{statusBadge(s.status)}</TableCell>
                  <TableCell className="text-center">
                    {s.status === "PENDING" && (
                      <div className="flex gap-1 justify-center">
                        <Button
                          size="sm" variant="outline"
                          className="text-emerald-700 border-emerald-200 hover:bg-emerald-50 h-7 px-2"
                          onClick={() => reviewMutation.mutate({ id: s.id, action: "ACCEPT" })}
                          disabled={reviewMutation.isPending}
                        >
                          <CheckIcon className="size-3.5 mr-1" /> Accept
                        </Button>
                        <Button
                          size="sm" variant="outline"
                          className="text-destructive border-destructive/40 hover:bg-destructive/5 h-7 px-2"
                          onClick={() => reviewMutation.mutate({ id: s.id, action: "REJECT" })}
                          disabled={reviewMutation.isPending}
                        >
                          <XIcon className="size-3.5 mr-1" /> Reject
                        </Button>
                      </div>
                    )}
                    {s.reviewedBy && (
                      <span className="text-xs text-muted-foreground">by {s.reviewedBy}</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}

