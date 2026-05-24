import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DotsThreeVerticalIcon,
  PencilSimpleIcon,
  TrashIcon,
  SunIcon,
  MoonIcon,
  MapPinIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

const fmt = (n) =>
  n != null
    ? new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(n)
    : "—";

const TIME_SLOT_META = {
  BREAKFAST:  { label: "Breakfast", icon: SunIcon,  bg: "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",  dot: "bg-amber-500" },
  LUNCH:      { label: "Lunch",     icon: SunIcon,  bg: "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400", dot: "bg-yellow-500" },
  EVENING:    { label: "Evening",   icon: MoonIcon, bg: "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400", dot: "bg-indigo-500" },
  FULL_DAY:   { label: "All Day",   icon: SunIcon,  bg: "bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400",         dot: "bg-teal-500" },
  CUSTOM:     { label: "Custom",    icon: SunIcon,  bg: "bg-zinc-50 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",            dot: "bg-zinc-400" },
};

function VegBadge({ comboType }) {
  const isVeg = comboType === "VEG" || comboType === "VEGAN";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border",
        isVeg
          ? "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-700"
          : "bg-red-50 text-red-500 border-red-200 dark:bg-red-900/30 dark:border-red-700"
      )}
    >
      <span
        className={cn("w-2 h-2 rounded-full", isVeg ? "bg-emerald-500" : "bg-red-500")}
      />
      {isVeg ? "Veg" : "Non-Veg"}
    </span>
  );
}

function TimeSlotPill({ timeSlot, schedules }) {
  const meta = TIME_SLOT_META[timeSlot] ?? TIME_SLOT_META.CUSTOM;
  const SlotIcon = meta.icon;

  // First active schedule time range
  const schedule = schedules?.[0];
  const timeRange = schedule
    ? `${schedule.startTime ?? ""} – ${schedule.endTime ?? ""}`
    : null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className={cn("inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full", meta.bg)}>
        <SlotIcon size={11} weight="bold" />
        {meta.label}
      </span>
      {timeRange && (
        <span className="text-[10px] font-semibold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/30 px-2 py-0.5 rounded-full">
          {timeRange}
        </span>
      )}
    </div>
  );
}

export default function ComboCard({ combo, onToggle, onEdit, onDelete, toggling }) {
  const isActive = combo.availabilityStatus === "AVAILABLE" || combo.isActive;
  const discount = combo.savingsPercentage
    ? Math.round(Number(combo.savingsPercentage))
    : null;

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm overflow-hidden">
      <div className="flex gap-3 p-3">
        {/* ── Image ── */}
        <div className="relative flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800">
          {combo.thumbnailUrl || combo.imageUrl ? (
            <img
              src={combo.thumbnailUrl ?? combo.imageUrl}
              alt={combo.comboName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-zinc-300">
              <span className="text-3xl">🍱</span>
            </div>
          )}
          {combo.isFeatured && (
            <div className="absolute top-1.5 left-1.5 bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
              <span>★</span> Featured
            </div>
          )}
        </div>

        {/* ── Body ── */}
        <div className="flex-1 min-w-0">
          {/* Name row */}
          <div className="flex items-start justify-between gap-1 mb-1">
            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
              <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-50 truncate">
                {combo.comboName}
              </span>
              <VegBadge comboType={combo.comboType} />
            </div>
            {/* Three-dot menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 transition-colors">
                  <DotsThreeVerticalIcon size={16} weight="bold" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={() => onEdit?.(combo)}>
                  <PencilSimpleIcon size={14} className="mr-2" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete?.(combo)}
                  className="text-red-500 focus:text-red-500"
                >
                  <TrashIcon size={14} className="mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Description (item names) */}
          {combo.itemNames?.length > 0 && (
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-1.5 leading-snug line-clamp-1">
              {combo.itemNames.join(" + ")}
            </p>
          )}

          {/* Time slot */}
          <div className="mb-2">
            <TimeSlotPill timeSlot={combo.timeSlot} schedules={combo.schedules} />
          </div>

          {/* Price row */}
          <div className="flex items-center gap-2 flex-wrap">
            {combo.originalPrice && (
              <span className="text-[11px] text-zinc-400 line-through">
                {fmt(combo.originalPrice)}
              </span>
            )}
            <span className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
              {fmt(combo.comboPrice)}
            </span>
            {discount != null && discount > 0 && (
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded-full">
                {discount}% OFF
              </span>
            )}
          </div>

          {/* Signature items */}
          {combo.signatureProducts?.length > 0 && (
            <div className="flex items-center gap-1 mt-1.5">
              <MapPinIcon size={10} className="text-zinc-400 flex-shrink-0" weight="fill" />
              <span className="text-[10px] text-zinc-400 line-clamp-1">
                {combo.signatureProducts.map((s) => s.productName ?? s.menuItemName).join(", ")}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Footer Stats + Toggle ── */}
      <div className="flex items-center justify-between px-3 pb-3 pt-0 gap-2">
        <div className="flex gap-4">
          <div>
            <p className="text-[10px] text-zinc-400">Orders Today</p>
            <p className="text-sm font-bold text-violet-600 dark:text-violet-400">
              {combo.ordersToday ?? 0}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-zinc-400">Revenue</p>
            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              {fmt(combo.revenueToday ?? 0)}
            </p>
          </div>
        </div>
        <Switch
          checked={isActive}
          disabled={toggling}
          onCheckedChange={(val) => onToggle?.(combo, val ? "ACTIVE" : "INACTIVE")}
        />
      </div>
    </div>
  );
}

