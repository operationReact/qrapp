import { useMemo, useState } from "react";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

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

const STATUS_TABS = [
  { key: "ALL", label: "All Combos" },
  { key: "ACTIVE", label: "Active" },
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
    <div className="min-h-screen bg-zinc-50 pb-32">
      {/* HEADER */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-zinc-100">
        <div className="px-4 pt-3 pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-[24px] font-bold tracking-tight text-zinc-900">
                    Combo Builder
                  </h1>

                  <Badge className="bg-violet-100 text-violet-700 rounded-full">
                    {combos.length}
                  </Badge>
                </div>

                <p className="text-sm text-zinc-500 mt-1">
                  Create and manage combo offerings
                </p>
              </div>
            </div>

            <div className="flex gap-2">
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

          {/* KPI */}
          <div className="flex gap-3 overflow-x-auto no-scrollbar mt-5 pb-1">
            <KpiCard title="Total" value={s?.totalCombos ?? 0} color="violet" />

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
                      ? "bg-violet-600 text-white"
                      : "bg-white border border-zinc-200 text-zinc-600"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div className="relative mt-4">
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
        </div>
      </div>

      {/* LIST */}
      <div className="px-4 pt-5 space-y-4">
        {combos.map((combo) => (
          <div
            key={combo.id}
            className="bg-white rounded-[28px] border border-zinc-100 overflow-hidden shadow-sm"
          >
            <div className="p-4">
              <div className="flex gap-4">
                {/* IMAGE */}
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

                {/* CONTENT */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-zinc-900">
                        {combo.comboName}
                      </h3>

                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge className="rounded-full bg-red-100 text-red-600">
                          {combo.comboType}
                        </Badge>

                        <Badge className="rounded-full bg-blue-100 text-blue-600">
                          {combo.timeSlot}
                        </Badge>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <div className="w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center cursor-pointer">
                          <DotsThreeVerticalIcon size={18} />
                        </div>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            navigate(`/admin/combos/${combo.id}/edit`)
                          }
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

                  {/* PRICE */}
                  <div className="mt-4 flex items-end gap-2">
                    <span className="text-2xl font-bold text-zinc-900">
                      ₹{combo.comboPrice}
                    </span>

                    <span className="text-sm text-zinc-400 line-through">
                      ₹{combo.originalPrice}
                    </span>

                    <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded-full">
                      {combo.savingsPercentage}% OFF
                    </span>
                  </div>

                  {/* ITEMS */}
                  <div className="mt-3 text-sm text-zinc-500 line-clamp-2">
                    {combo.items?.map((i) => i.name).join(", ")}
                  </div>

                  {/* FOOTER */}
                  <div className="mt-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-zinc-400">Orders Today</p>

                      <p className="font-bold text-zinc-900">
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
      <div className="mx-4 mt-5 bg-violet-50 border border-violet-100 rounded-[24px] p-4 flex items-start gap-3">
        <div className="w-11 h-11 rounded-2xl bg-violet-100 flex items-center justify-center text-violet-600 flex-shrink-0">
          <SparkleIcon size={20} weight="fill" />
        </div>

        <div>
          <p className="text-sm font-bold text-violet-800">
            Tip: Featured combos sell more
          </p>

          <p className="text-xs text-violet-600 mt-1">
            Featured combos on homepage get more visibility.
          </p>
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={() => navigate("/admin/combos/create")}
        className="fixed bottom-24 right-5 w-16 h-16 rounded-full bg-violet-600 shadow-2xl shadow-violet-300 flex items-center justify-center text-white z-40 active:scale-95 transition-transform"
      >
        <PlusIcon size={28} weight="bold" />
      </button>
    </div>
  );
}

function KpiCard({ title, value, color }) {
  const colorMap = {
    violet: "bg-violet-50 border-violet-100 text-violet-700",
    green: "bg-green-50 border-green-100 text-green-700",
    orange: "bg-orange-50 border-orange-100 text-orange-700",
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
