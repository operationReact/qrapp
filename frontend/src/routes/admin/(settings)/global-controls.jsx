import { createFileRoute, Navigate, useLocation } from "@tanstack/react-router";
import { useAuth } from "@/context/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminSetPayAtStall } from "@/services/order-service";
import { adminSettingsOptions, paymentConfigOptions } from "@/query/options/orders";
import AdminHeader from "@/components/admin/AdminHeader";
import { CurrencyInrIcon, SlidersIcon } from "@phosphor-icons/react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/(settings)/global-controls")({
  component: GlobalControlsPage,
});

function ToggleRow({ title, description, icon, enabled, onToggle, loading }) {
  const RowIcon = icon;
  return (
    <div className="flex items-center justify-between gap-4 py-4 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-3">
        <div
          className={`size-10 rounded-lg flex items-center justify-center shrink-0 border ${
            enabled ? "bg-emerald-50 border-emerald-200" : "bg-gray-50 border-gray-200"
          }`}
        >
          <RowIcon
            weight="fill"
            className={`size-5 ${enabled ? "text-emerald-600" : "text-gray-400"}`}
          />
        </div>
        <div>
          <div className="text-sm font-semibold text-gray-900">{title}</div>
          <div className="text-xs text-gray-500 mt-0.5 max-w-sm">{description}</div>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className={`text-xs font-semibold ${enabled ? "text-emerald-600" : "text-gray-400"}`}>
          {loading ? "Saving…" : enabled ? "Enabled" : "Disabled"}
        </span>
        <button
          onClick={onToggle}
          disabled={loading || enabled === null || enabled === undefined}
          aria-label={`Toggle ${title}`}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
            enabled ? "bg-emerald-500" : "bg-gray-300"
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              enabled ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>
    </div>
  );
}

function GlobalControlsPage() {
  const { isAdmin, isSuperUser } = useAuth();
  const { pathname } = useLocation();
  const queryClient = useQueryClient();

  // Fetch current settings from server (auto-retries, cached)
  const { data: settings, isLoading } = useQuery(adminSettingsOptions);
  const payAtStall = settings?.payAtStallEnabled ?? false;

  // Toggle mutation — invalidates both admin settings AND the public payment config cache
  const toggleMutation = useMutation({
    mutationFn: (enabled) => adminSetPayAtStall(enabled),
    onSuccess: (_, enabled) => {
      queryClient.invalidateQueries({ queryKey: adminSettingsOptions.queryKey });
      queryClient.invalidateQueries({ queryKey: paymentConfigOptions.queryKey });
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
    <>
      <AdminHeader
        title="Global Controls"
        description="Enable or disable features across the entire app."
      />
      <div className="px-4 py-5 max-w-2xl space-y-6">

        {/* ── Payment Methods ── */}
        <section className="rounded-xl border border-border bg-white overflow-hidden">
          <div className="px-4 pt-4 pb-2 flex items-center gap-2 border-b border-gray-100">
            <SlidersIcon weight="bold" className="size-4 text-primary" />
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
              Payment Methods
            </h2>
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
    </>
  );
}
