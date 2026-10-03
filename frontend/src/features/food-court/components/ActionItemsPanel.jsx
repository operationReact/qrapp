import { useState } from "react";
import { Loader2, Plus, ListChecks, X, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatDate, isActionOpen } from "../format";
import { PanelError, PanelLoading, StatusPill } from "./FeatureStates";

const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];

const PRIORITY_TONES = {
  LOW: "muted",
  MEDIUM: "info",
  HIGH: "warning",
  URGENT: "danger",
};

const emptyForm = {
  title: "",
  description: "",
  priority: "MEDIUM",
  dueDate: "",
};

export function ActionItemsPanel({ query, onCreate, isCreating, onToggleStatus, isUpdating }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const items = query.data || [];

  function submit(event) {
    event.preventDefault();
    if (!form.title.trim()) return;
    onCreate(
      { ...form, dueDate: form.dueDate || null },
      {
        onSuccess: () => {
          setForm(emptyForm);
          setShowForm(false);
        },
      },
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-[var(--cc-secondary-text)]">
          Track follow-ups, repairs and tenant tasks.
        </p>
        <Button size="sm" onClick={() => setShowForm((value) => !value)}>
          <Plus className="size-4" /> New action
        </Button>
      </div>

      {showForm && (
        <Card className="rounded-[16px] border-[var(--cc-border)] bg-white p-4">
          <form className="grid gap-3 sm:grid-cols-2" onSubmit={submit}>
            <div className="space-y-1 sm:col-span-2">
              <Label>Title *</Label>
              <Input
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                placeholder="e.g. Repair stall 4 signage"
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(value) => setForm({ ...form, priority: value })}>
                <SelectTrigger className="h-11 w-full rounded-[10px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      {priority.charAt(0) + priority.slice(1).toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Due date</Label>
              <Input
                type="date"
                value={form.dueDate}
                onChange={(event) => setForm({ ...form, dueDate: event.target.value })}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2 sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                <X className="size-4" /> Cancel
              </Button>
              <Button type="submit" disabled={isCreating || !form.title.trim()}>
                {isCreating && <Loader2 className="mr-2 size-4 animate-spin" />}
                Create
              </Button>
            </div>
          </form>
        </Card>
      )}

      {query.isLoading ? (
        <PanelLoading rows={4} />
      ) : query.isError ? (
        <PanelError onRetry={query.refetch} />
      ) : items.length === 0 ? (
        <Card className="rounded-[16px] border border-dashed border-[var(--cc-border)] bg-white">
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <ListChecks className="size-6 text-[var(--cc-muted-text)]" aria-hidden="true" />
            <p className="text-sm font-semibold text-[var(--cc-text)]">No action items</p>
            <p className="text-xs text-[var(--cc-secondary-text)]">
              Create an action item to keep track of pending work.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const open = isActionOpen(item);
            const priority = String(item.priority || "MEDIUM").toUpperCase();
            return (
              <Card
                key={item.id}
                className={cn(
                  "flex items-start gap-3 rounded-[14px] border-[var(--cc-border)] bg-white p-3",
                  !open && "opacity-70",
                )}
              >
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => onToggleStatus({ actionItemId: item.id, status: open ? "DONE" : "OPEN" })}
                  aria-label={open ? "Mark as done" : "Reopen"}
                  className={cn(
                    "mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border transition",
                    open
                      ? "border-[var(--cc-border)] hover:border-[var(--cc-primary)]"
                      : "border-[var(--cc-success)] bg-[var(--cc-success)] text-white",
                  )}
                >
                  {!open && <Check className="size-3.5" />}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={cn("text-sm font-semibold text-[var(--cc-text)]", !open && "line-through")}>
                      {item.title}
                    </p>
                    <StatusPill tone={PRIORITY_TONES[priority] || "muted"}>{priority}</StatusPill>
                  </div>
                  {item.description && (
                    <p className="mt-0.5 text-xs text-[var(--cc-secondary-text)]">{item.description}</p>
                  )}
                  {item.dueDate && (
                    <p className="mt-1 text-[11px] text-[var(--cc-muted-text)]">Due {formatDate(item.dueDate)}</p>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
