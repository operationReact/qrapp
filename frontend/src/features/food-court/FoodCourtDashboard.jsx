import { useMemo, useState } from "react";
import { Store, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

import { currentMonthValue, deriveKpis } from "./format";
import {
  useActionItems,
  useCreateActionItem,
  useCreateExpense,
  useDeposits,
  useExpenses,
  useFoodCourts,
  useFoodCourtSummary,
  useLeases,
  useRecordRentPayment,
  useRents,
  useStalls,
  useTenants,
  useUpdateActionItemStatus,
} from "./hooks";
import { FoodCourtSelector } from "./components/FoodCourtSelector";
import { MonthSelector } from "./components/MonthSelector";
import { KpiCards } from "./components/KpiCards";
import { StallsPanel } from "./components/StallsPanel";
import { TenantsPanel } from "./components/TenantsPanel";
import { LeasesPanel } from "./components/LeasesPanel";
import { RentPanel } from "./components/RentPanel";
import { DepositsPanel } from "./components/DepositsPanel";
import { ExpensesPanel } from "./components/ExpensesPanel";
import { ActionItemsPanel } from "./components/ActionItemsPanel";
import { PanelEmpty, PanelError, PanelLoading } from "./components/FeatureStates";

const TABS = [
  { key: "stalls", label: "Stalls" },
  { key: "tenants", label: "Tenants" },
  { key: "leases", label: "Leases" },
  { key: "rent", label: "Rent" },
  { key: "deposits", label: "Deposits" },
  { key: "expenses", label: "Expenses" },
  { key: "actions", label: "Action Items" },
];

export function FoodCourtDashboard() {
  const [selectedId, setSelectedId] = useState(null);
  const [month, setMonth] = useState(currentMonthValue);
  const [activeTab, setActiveTab] = useState("stalls");

  const foodCourtsQuery = useFoodCourts();
  const foodCourts = useMemo(() => foodCourtsQuery.data || [], [foodCourtsQuery.data]);

  // Fall back to the first food court until the user explicitly picks one —
  // derived during render so we avoid a setState-in-effect cascade.
  const foodCourtId = selectedId ?? foodCourts[0]?.id ?? null;

  const summaryQuery = useFoodCourtSummary(foodCourtId, month);
  const stallsQuery = useStalls(foodCourtId);
  const tenantsQuery = useTenants(foodCourtId);
  const leasesQuery = useLeases(foodCourtId);
  const rentsQuery = useRents(foodCourtId, month);
  const depositsQuery = useDeposits(foodCourtId);
  const expensesQuery = useExpenses(foodCourtId, month);
  const actionItemsQuery = useActionItems(foodCourtId);

  const recordPayment = useRecordRentPayment(foodCourtId, month);
  const createExpense = useCreateExpense(foodCourtId, month);
  const createActionItem = useCreateActionItem(foodCourtId);
  const updateActionStatus = useUpdateActionItemStatus(foodCourtId);

  const kpis = useMemo(
    () =>
      deriveKpis({
        stalls: stallsQuery.data || [],
        tenants: tenantsQuery.data || [],
        leases: leasesQuery.data || [],
        rents: rentsQuery.data || [],
        expenses: expensesQuery.data || [],
        actionItems: actionItemsQuery.data || [],
        summary: summaryQuery.data || null,
      }),
    [
      stallsQuery.data,
      tenantsQuery.data,
      leasesQuery.data,
      rentsQuery.data,
      expensesQuery.data,
      actionItemsQuery.data,
      summaryQuery.data,
    ],
  );

  const kpiLoading =
    Boolean(foodCourtId) &&
    (stallsQuery.isLoading ||
      rentsQuery.isLoading ||
      leasesQuery.isLoading ||
      expensesQuery.isLoading ||
      actionItemsQuery.isLoading);

  const refetchAll = () => {
    summaryQuery.refetch();
    stallsQuery.refetch();
    tenantsQuery.refetch();
    leasesQuery.refetch();
    rentsQuery.refetch();
    depositsQuery.refetch();
    expensesQuery.refetch();
    actionItemsQuery.refetch();
  };

  return (
    <main className="admin-control-center mx-auto min-h-screen w-full max-w-[1440px] space-y-5 bg-[var(--cc-page)] p-4 pb-10 text-[var(--cc-text)] md:p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold leading-8">Food Court Management</h1>
          <p className="mt-1 text-[13px] text-[var(--cc-secondary-text)]">
            Stalls, tenants, leases, rent collection and running costs at a glance.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <FoodCourtSelector
            foodCourts={foodCourts}
            value={foodCourtId}
            onChange={(value) => setSelectedId(value)}
            disabled={foodCourtsQuery.isLoading || foodCourts.length === 0}
          />
          <MonthSelector value={month} onChange={setMonth} disabled={!foodCourtId} />
          <Button
            variant="outline"
            className="h-11 rounded-[10px]"
            onClick={refetchAll}
            disabled={!foodCourtId}
            aria-label="Refresh"
          >
            <RefreshCw className="size-4" />
          </Button>
        </div>
      </header>

      {foodCourtsQuery.isLoading ? (
        <PanelLoading rows={3} />
      ) : foodCourtsQuery.isError ? (
        <PanelError
          onRetry={foodCourtsQuery.refetch}
          message="Unable to load food courts. Please try again."
        />
      ) : foodCourts.length === 0 ? (
        <PanelEmpty
          icon={Store}
          title="No food courts available"
          description="Once a food court is set up it will be selectable here along with its stalls, tenants and finances."
        />
      ) : (
        <>
          <KpiCards kpis={kpis} loading={kpiLoading} />

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList variant="line" className="flex-wrap">
              {TABS.map((tab) => (
                <TabsTrigger key={tab.key} value={tab.key}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <section className={cn("min-h-[12rem]")}>
            {activeTab === "stalls" && <StallsPanel query={stallsQuery} />}
            {activeTab === "tenants" && <TenantsPanel query={tenantsQuery} />}
            {activeTab === "leases" && <LeasesPanel query={leasesQuery} />}
            {activeTab === "rent" && (
              <RentPanel
                query={rentsQuery}
                month={month}
                onRecordPayment={recordPayment.mutate}
                isRecording={recordPayment.isPending}
              />
            )}
            {activeTab === "deposits" && <DepositsPanel query={depositsQuery} />}
            {activeTab === "expenses" && (
              <ExpensesPanel
                query={expensesQuery}
                month={month}
                onCreate={createExpense.mutate}
                isCreating={createExpense.isPending}
              />
            )}
            {activeTab === "actions" && (
              <ActionItemsPanel
                query={actionItemsQuery}
                onCreate={createActionItem.mutate}
                isCreating={createActionItem.isPending}
                onToggleStatus={updateActionStatus.mutate}
                isUpdating={updateActionStatus.isPending}
              />
            )}
          </section>
        </>
      )}
    </main>
  );
}
