import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button, buttonVariants } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { cn } from "@/lib/utils";

import {
  MagnifyingGlassIcon,
  PlusIcon,
  SparkleIcon,
  FunnelIcon,
  PencilSimpleIcon,
  TrashIcon,
  DotsThreeVerticalIcon,
} from "@phosphor-icons/react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { toast } from "sonner";

import {
  useComboList,
  useComboSummary,
  useComboMutations,
} from "@/hooks/useCombos";
import { createFileRoute } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";

const STATUS_TABS = [
  { key: "ALL", label: "All Combos", badgeProperty: "totalCombos" },
  { key: "ACTIVE", label: "Active", badgeProperty: "activeCombos" },
  { key: "INACTIVE", label: "Inactive" },
];

export const Route = createFileRoute("/admin/(menu)/combos/")({
  component: CombosPage,
});

export default function CombosPage() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("ALL");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const queryParams = useMemo(() => {
    const p = { size: 50 };

    if (search) p.search = search;
    if (activeTab === "ACTIVE") p.isActive = true;
    if (activeTab === "INACTIVE") p.isActive = false;

    return p;
  }, [search, activeTab]);

  const list = useComboList(queryParams);
  const summary = useComboSummary();

  const combos = list.data?.content ?? list.data ?? [];
  const s = summary.data;

  const mutations = useComboMutations(() => {
    list.refetch();
    summary.refetch();
  });

  const handleToggle = async (combo, active) => {
    try {
      await mutations.updateStatus(combo.id, active ? "ACTIVE" : "INACTIVE");

      toast.success(active ? "Combo enabled" : "Combo disabled");
    } catch {
      toast.error("Failed to update combo");
    }
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* HEADER */}
      <div className="sticky top-0 z-20 bg-card/95 backdrop-blur border-b border-border">
        <div className="px-4 pt-3 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-semibold tracking-tight text-foreground">
                  Combos
                </h1>

                <Badge variant="secondary" className="rounded-full">
                  {combos.length}
                </Badge>
              </div>

              <p className="text-sm text-muted-foreground mt-1">
                Bundle popular items into combos that lift basket size and clear
                slow movers.
              </p>
            </div>
          </div>

          {/* KPI */}
          <div className="flex gap-3 overflow-x-auto no-scrollbar mt-5 pb-1">
            <KpiCard title="Total" value={s?.totalCombos ?? 0} tone="primary" />

            <KpiCard
              title="Active"
              value={s?.activeCombos ?? 0}
              tone="emerald"
            />

            <KpiCard
              title="Revenue"
              value={`₹${s?.comboRevenue ?? 0}`}
              tone="amber"
            />
          </div>

          {/* Tabs */}
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full border-b mt-5"
          >
            <TabsList variant="line">
              {STATUS_TABS.map((tab) => (
                <TabsTrigger key={tab.key} value={tab.key}>
                  {tab.label}
                  {tab.badgeProperty && (
                    <Badge variant="secondary" className="ml-2">{s?.[tab.badgeProperty]}</Badge>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {/* Search */}
          <div className="mt-4 flex justify-between items-center gap-2">
            <InputGroup className="h-10 max-w-xs bg-zinc-100">
              <InputGroupInput
                placeholder="Search combos..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onBlur={() => setSearch(searchInput.trim())}
              />
              <InputGroupAddon>
                <MagnifyingGlassIcon />
              </InputGroupAddon>
            </InputGroup>

            <Button
              variant="secondary"
              size="icon-lg"
              className="relative"
              aria-label="Filter combos"
            >
              <FunnelIcon />

              <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] size-5 rounded-full flex items-center justify-center font-bold">
                2
              </span>
            </Button>
          </div>
        </div>
      </div>

      {/* LIST */}
      <div className="px-4 pt-5 flex flex-col gap-4">
        {list.loading &&
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-card rounded-xl border border-border p-4 h-32 animate-pulse"
            />
          ))}

        {!list.loading && combos.length === 0 && (
          <Empty className="border border-dashed border-border bg-card rounded-xl py-12">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <SparkleIcon size={20} weight="fill" />
              </EmptyMedia>
              <EmptyTitle>No combos here yet</EmptyTitle>
              <EmptyDescription>
                Create your first combo to start cross-selling — it takes under
                a minute.
              </EmptyDescription>
            </EmptyHeader>
            <Link
              to="/admin/combos/create"
              className={buttonVariants({
                variant: "outline",
                className: "border-border!",
              })}
            >
              <PlusIcon data-icon="inline-start" />
              Create Combo
            </Link>
          </Empty>
        )}

        {combos.map((combo) => (
          <div
            key={combo.id}
            className="bg-card rounded-xl border border-border overflow-hidden shadow-sm"
          >
            <div className="p-4">
              <div className="flex gap-4">
                {/* IMAGE */}
                <div className="relative shrink-0">
                  <img
                    src={combo.imageUrl}
                    alt={combo.comboName}
                    className="size-28 rounded-xl object-cover bg-muted"
                  />

                  {combo.isFeatured && (
                    <div className="absolute top-2 left-2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-full">
                      Featured
                    </div>
                  )}
                </div>

                {/* CONTENT */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold text-foreground line-clamp-1">
                        {combo.comboName}
                      </h3>

                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge
                          variant="outline"
                          className="rounded-full border-red-200 bg-red-50 text-red-600 dark:bg-red-500/10 dark:border-red-500/30"
                        >
                          {combo.comboType}
                        </Badge>

                        <Badge
                          variant="outline"
                          className="rounded-full border-blue-200 bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:border-blue-500/30"
                        >
                          {combo.timeSlot}
                        </Badge>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="rounded-xl bg-muted text-muted-foreground hover:bg-muted/80"
                          >
                            <DotsThreeVerticalIcon size={18} weight="bold" />
                          </Button>
                        }
                      />

                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            navigate(`/admin/combos/${combo.id}/edit`)
                          }
                        >
                          <PencilSimpleIcon
                            size={16}
                            data-icon="inline-start"
                          />
                          Edit
                        </DropdownMenuItem>

                        <DropdownMenuItem className="text-red-500 focus:text-red-500">
                          <TrashIcon size={16} data-icon="inline-start" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* PRICE */}
                  <div className="mt-4 flex items-end gap-2 flex-wrap">
                    <span className="text-2xl font-semibold text-foreground">
                      ₹{combo.comboPrice}
                    </span>

                    <span className="text-sm text-muted-foreground line-through">
                      ₹{combo.originalPrice}
                    </span>

                    <span className="text-xs font-bold text-emerald-600 bg-emerald-500/10 px-2 py-1 rounded-full">
                      {combo.savingsPercentage}% OFF
                    </span>
                  </div>

                  {/* ITEMS */}
                  <div className="mt-3 text-sm text-muted-foreground line-clamp-2">
                    {combo.items?.map((i) => i.name).join(", ")}
                  </div>

                  {/* FOOTER */}
                  <div className="mt-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Orders Today
                      </p>

                      <p className="font-semibold text-foreground">
                        {combo.ordersToday ?? 0}
                      </p>
                    </div>

                    <Switch
                      checked={combo.isActive}
                      onCheckedChange={(v) => handleToggle(combo, v)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* TIP */}
      {combos.length > 0 && (
        <div className="mx-4 mt-5 bg-primary/5 border border-primary/15 rounded-xl p-4 flex items-start gap-3">
          <div className="size-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <SparkleIcon size={20} weight="fill" />
          </div>

          <div>
            <p className="text-sm font-semibold text-foreground">
              Tip: Featured combos sell more
            </p>

            <p className="text-xs text-muted-foreground mt-1">
              Featured combos on homepage get more visibility.
            </p>
          </div>
        </div>
      )}

      <Link
        to="/admin/combos/create"
        className={buttonVariants({
          size: "icon-lg",
          className:
            "fixed bottom-10 right-10 size-14 rounded-xl shadow-2xl shadow-primary/30 z-40 active:translate-y-px",
        })}
        aria-label="Create combo"
      >
        <PlusIcon size={28} weight="bold" />
      </Link>
    </div>
  );
}

const KPI_TONE_MAP = {
  primary: {
    icon: "bg-primary/10 text-primary",
  },
  emerald: {
    icon: "bg-emerald-500/10 text-emerald-600",
  },
  amber: {
    icon: "bg-amber-500/10 text-amber-600",
  },
};

function KpiCard({ title, value, tone = "primary" }) {
  const toneClasses = KPI_TONE_MAP[tone] ?? KPI_TONE_MAP.primary;

  return (
    <div
      className={cn(
        "min-w-[200px] rounded-lg border border-border bg-card p-2 flex flex-col gap-2 p-4",
      )}
    >
      <div
        className={cn(
          "size-8 rounded-lg flex items-center justify-center",
          toneClasses.icon,
        )}
      >
        <SparkleIcon size={14} weight="fill" />
      </div>

      <div>
        <p className="text-xs font-medium text-muted-foreground leading-none mb-1">
          {title}
        </p>

        <p className="text-xl font-semibold text-foreground leading-tight truncate">
          {value}
        </p>
      </div>
    </div>
  );
}
