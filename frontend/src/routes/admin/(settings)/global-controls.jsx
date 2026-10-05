import { createFileRoute, Navigate, useLocation } from "@tanstack/react-router";
import { useAuth } from "@/context/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminSetPayAtStall } from "@/services/order-service";
import { adminSettingsOptions, paymentConfigOptions } from "@/query/options/orders";
import { CurrencyInrIcon, SlidersIcon } from "@phosphor-icons/react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/(settings)/global-controls")({
  component: GlobalControlsPage,
});

function ToggleRow({ title, description, icon, enabled, onToggle, loading }) {
  const RowIcon = icon;
  return (
    <div className="flex items-center justify-between gap-4 py-4 border-b border-zinc-100 last:border-0">
      <div className="flex items-center gap-3 min-w-0">
        <div className={cn(
          "size-10 rounded-xl flex items-center justify-center shrink-0",
          enabled ? "bg-emerald-50 text-emerald-600" : "bg-zinc-50 text-zinc-400",
        )}>
          <RowIcon weight="fill" className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground mt-0.5 max-w-sm leading-relaxed">{description}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className={cn(
          "text-xs font-semibold hidden sm:block",
          enabled ? "text-emerald-600" : "text-muted-foreground",
        )}>
          {loading ? "Saving…" : enabled ? "Enabled" : "Disabled"}
        </span>
        <Switch
          checked={!!enabled}
          onCheckedChange={onToggle}
          disabled={loading || enabled === null || enabled === undefined}
          aria-label={`Toggle ${title}`}
        />
      </div>
    </div>
  );
}

function GlobalControlsPage() {
  const { isAdmin, isSuperUser } = useAuth();
  const { pathname } = useLocation();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery(adminSettingsOptions);
  const payAtStall = settings?.payAtStallEnabled ?? false;

  const toggleMutation = useMutation({
    mutationFn: (enabled) => adminSetPayAtStall(enabled),
    onSuccess: (_, enabled) => {
      queryClient.invalidateQueries({ queryKey: adminSettingsOptions.queryKey });
      queryClient.invalidateQueries({ queryKey: ["payment", "config"] });
      toast.success(`Pay at Stall ${enabled ? "enabled" : "disabled"} successfully`);
    },
    onError: () => {
      toast.error("Failed to update setting. Please try again.");
    },
  });

  if (!isAdmin && !isSuperUser) {
    return <Navigate to="/login" replace state={{ from: pathname }} />;
  }

  return (
    <div className="max-w-2xl">
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="px-4 pt-6 pb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-[28px] leading-tight">
          Settings
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Enable or disable features across the entire app.
        </p>
      </div>

      <div className="px-4 pb-8 space-y-4">
        {/* ── Payment Methods card ─────────────────────────────────────────────── */}
        <section className="rounded-2xl border border-border bg-white overflow-hidden shadow-sm">
          <div className="px-4 pt-4 pb-3 border-b border-zinc-100 flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-primary/8 flex items-center justify-center">
              <SlidersIcon weight="bold" className="size-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">Payment Methods</h2>
              <p className="text-xs text-muted-foreground">Control which payment options are available to customers.</p>
            </div>
          </div>
          <div className="px-4">
            <ToggleRow
              icon={CurrencyInrIcon}
              title="Pay at Stall"
              description="Allow customers to place an order without paying upfront. They settle the bill in cash or card at the counter when collecting their order."
              enabled={isLoading ? null : payAtStall}
              loading={toggleMutation.isPending}
              onToggle={() => toggleMutation.mutate(!payAtStall)}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
