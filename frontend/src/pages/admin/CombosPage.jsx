import { useMemo, useState } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

import CreateComboSheet from "@/components/admin/combo/CreateComboSheet";
import {
  useComboList,
  useComboSummary,
  useComboMutations,
} from "@/hooks/useCombos";

const STATUS_TABS = [
  { key: "ALL", label: "All Combos" },
  { key: "ACTIVE", label: "Active" },
  { key: "INACTIVE", label: "Inactive" },
  { key: "DRAFT", label: "Scheduled" },
];

export default function CombosPage() {
  const [activeTab, setActiveTab] = useState("ALL");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingCombo, setEditingCombo] = useState(null);

  const queryParams = useMemo(() => {
    const p = { size: 50 };

    if (search) p.search = search;
    if (activeTab === "ACTIVE") p.isActive = true;
    if (activeTab === "INACTIVE") p.isActive = false;
    if (activeTab === "DRAFT") p.status = "DRAFT";

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

  const tabCounts = {
    ALL: s?.totalCombos ?? combos.length,
    ACTIVE: s?.activeCombos ?? 0,
    INACTIVE: s ? s.totalCombos - s.activeCombos : 0,
    DRAFT: 0,
  };

  const handleSave = async (payload) => {
    try {
      if (editingCombo) {
        await mutations.update(editingCombo.id, payload);
        toast.success("Combo updated");
      } else {
        await mutations.create(payload);
        toast.success("Combo created");
      }

      setSheetOpen(false);
      setEditingCombo(null);
    } catch {
      toast.error("Failed to save combo");
    }
  };

  const handleToggle = async (combo, active) => {
    try {
      await mutations.updateStatus(combo.id, active ? "ACTIVE" : "INACTIVE");

      toast.success(active ? "Combo enabled" : "Combo disabled");
    } catch {
      toast.error("Failed to update combo");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 pb-32">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-zinc-100">
        <div className="px-4 pt-3 pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <SidebarTrigger className="mt-1 text-zinc-600" />

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-[22px] font-bold tracking-tight text-zinc-900">
                    Combo Builder
                  </h1>

                  <Badge className="bg-violet-100 text-violet-700 hover:bg-violet-100 rounded-full">
                    {tabCounts.ALL} items
                  </Badge>
                </div>

                <p className="text-sm text-zinc-500 mt-1">
                  Create and manage combo offerings
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button className="w-11 h-11 rounded-2xl bg-white border border-zinc-200 flex items-center justify-center shadow-sm">
                <MagnifyingGlassIcon size={18} />
              </button>

              <button className="w-11 h-11 rounded-2xl bg-white border border-zinc-200 flex items-center justify-center shadow-sm relative">
                <FunnelIcon size={18} />

                <span className="absolute -top-1 -right-1 bg-violet-600 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold">
                  2
                </span>
              </button>
            </div>
          </div>

          {/* KPI CARDS */}
          <div className="flex gap-3 overflow-x-auto no-scrollbar mt-5 pb-1">
            <KpiCard
              title="Total Combos"
              value={s?.totalCombos ?? 0}
              color="violet"
            />

            <KpiCard
              title="Active"
              value={s?.activeCombos ?? 0}
              color="green"
            />

            <KpiCard
              title="Revenue"
              value={`₹${s?.comboRevenue ?? 0}`}
              color="orange"
            />

            <KpiCard
              title="Top Combo"
              value={s?.topComboName ?? "Lunch Feast"}
              color="blue"
            />
          </div>

          {/* Tabs */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar mt-5 pb-1">
            {STATUS_TABS.map((tab) => {
              const active = activeTab === tab.key;

              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-shrink-0 h-11 px-5 rounded-full text-sm font-semibold transition-all ${
                    active
                      ? "bg-violet-600 text-white shadow-md shadow-violet-200"
                      : "bg-white border border-zinc-200 text-zinc-600"
                  }`}
                >
                  {tab.label}

                  <span
                    className={`ml-2 text-[11px] px-2 py-0.5 rounded-full ${
                      active ? "bg-white/20 text-white" : "bg-zinc-100 text-zinc-500"
                    }`}
                  >
                    {tabCounts[tab.key]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div className="flex gap-2 mt-4">
            <div className="relative flex-1">
              <MagnifyingGlassIcon
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"
              />

              <Input
                placeholder="Search combos..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onBlur={() => setSearch(searchInput.trim())}
                className="h-12 rounded-2xl pl-11 border-zinc-200 bg-white"
              />
            </div>

            <Button
              variant="outline"
              className="h-12 rounded-2xl px-5 bg-white"
            >
              Filter
            </Button>
          </div>
        </div>
      </div>

      {/* Combo List */}
      <div className="px-4 pt-5 space-y-4">
        {combos.map((combo) => (
          <div
            key={combo.id}
            className="bg-white rounded-[28px] border border-zinc-100 overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.03)]"
          >
            <div className="p-4">
              <div className="flex gap-4">
                {/* Image */}
                <div className="relative flex-shrink-0">
                  <img
                    src={combo.imageUrl}
                    alt={combo.comboName}
                    className="w-28 h-28 rounded-2xl object-cover"
                  />

                  {combo.isFeatured && (
                    <div className="absolute top-2 left-2 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-full">
                      Featured
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-lg font-bold text-zinc-900 leading-tight">
                        {combo.comboName}
                      </h3>

                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <Badge className="rounded-full bg-red-100 text-red-600 hover:bg-red-100">
                          {combo.comboType}
                        </Badge>

                        <Badge className="rounded-full bg-blue-100 text-blue-600 hover:bg-blue-100">
                          {combo.timeSlot}
                        </Badge>

                        {combo.isPreorderEligible && (
                          <Badge className="rounded-full bg-violet-100 text-violet-700 hover:bg-violet-100">
                            Preorder
                          </Badge>
                        )}
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center">
                          <DotsThreeVerticalIcon size={18} />
                        </button>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setEditingCombo(combo);
                            setSheetOpen(true);
                          }}
                        >
                          <PencilSimpleIcon size={16} />
                          Edit
                        </DropdownMenuItem>

                        <DropdownMenuItem className="text-red-500">
                          <TrashIcon size={16} />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Price */}
                  <div className="mt-4 flex items-end gap-2">
                    <span className="text-2xl font-bold text-zinc-900">
                      ₹{combo.comboPrice}
                    </span>

                    <span className="text-sm text-zinc-400 line-through mb-0.5">
                      ₹{combo.originalPrice}
                    </span>

                    <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded-full mb-0.5">
                      {combo.savingsPercentage}% OFF
                    </span>
                  </div>

                  {/* Items */}
                  <div className="mt-3 text-sm text-zinc-500 line-clamp-2">
                    {combo.items?.map((i) => i.name).join(", ")}
                  </div>

                  {/* Footer */}
                  <div className="mt-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-zinc-400">Orders Today</p>
                      <p className="font-bold text-zinc-900">
                        {combo.ordersToday ?? 0}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`text-sm font-semibold ${
                          combo.isActive ? "text-green-600" : "text-zinc-400"
                        }`}
                      >
                        {combo.isActive ? "Available" : "Inactive"}
                      </span>

                      <Switch
                        checked={combo.isActive}
                        onCheckedChange={(v) => handleToggle(combo, v)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tip Banner */}
      <div className="mx-4 mt-5 bg-violet-50 border border-violet-100 rounded-[24px] p-4 flex items-start gap-3">
        <div className="w-11 h-11 rounded-2xl bg-violet-100 flex items-center justify-center text-violet-600 flex-shrink-0">
          <SparkleIcon size={20} weight="fill" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-violet-800">
            Tip: Increase Combo Sales
          </p>

          <p className="text-xs text-violet-600 mt-1 leading-relaxed">
            Featured combos on homepage get 2.4× more orders.
          </p>
        </div>
      </div>

      {/* Floating Button */}
      <button
        onClick={() => {
          setEditingCombo(null);
          setSheetOpen(true);
        }}
        className="fixed bottom-24 right-5 w-16 h-16 rounded-full bg-violet-600 shadow-2xl shadow-violet-300 flex items-center justify-center text-white z-40 active:scale-95 transition-transform"
      >
        <PlusIcon size={28} weight="bold" />
      </button>

      {/* Create/Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="bottom"
          className="h-[92vh] rounded-t-[32px] border-0 p-0"
        >
          <SheetHeader className="px-5 pt-5 pb-3 border-b border-zinc-100 text-left">
            <SheetTitle className="text-xl font-bold">
              {editingCombo ? "Edit Combo" : "Create Combo"}
            </SheetTitle>

            <SheetDescription>
              Build the perfect combo offering
            </SheetDescription>
          </SheetHeader>

          <div className="overflow-y-auto h-full pb-40">
            <CreateComboSheet
              open={sheetOpen}
              onClose={() => setSheetOpen(false)}
              initialData={editingCombo}
              onSave={handleSave}
              busy={mutations.busy}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function KpiCard({ title, value, color }) {
  const colorMap = {
    violet: "bg-violet-50 border-violet-100 text-violet-700",
    green: "bg-green-50 border-green-100 text-green-700",
    orange: "bg-orange-50 border-orange-100 text-orange-700",
    blue: "bg-blue-50 border-blue-100 text-blue-700",
  };

  return (
    <div
      className={`min-w-[150px] rounded-[24px] border p-4 ${colorMap[color]}`}
    >
      <p className="text-xs font-medium opacity-70">{title}</p>

      <p className="text-2xl font-bold mt-3 leading-none">{value}</p>
    </div>
  );
}
