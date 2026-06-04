import PropTypes from "prop-types";
import { useState } from "react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  BowlFoodIcon,
  CalendarBlankIcon,
  CalendarPlusIcon,
  CaretDownIcon,
  ClockIcon,
  CoinIcon,
  DotsThreeVerticalIcon,
  LeafIcon,
  MoonIcon,
  PackageIcon,
  PencilSimpleIcon,
  StarIcon,
  SunHorizonIcon,
  SunIcon,
  TagIcon,
  TrashIcon,
  UserCircleIcon,
} from "@phosphor-icons/react";

import { cn } from "@/lib/utils";
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
import { Label } from "@/components/ui/label";

// ── Formatters (mirrors PartyOrderCard.jsx) ────────────────────────────────

function formatCurrency(amount) {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatTimeRange(startTime, endTime) {
  const trim = (t) => (t ? String(t).slice(0, 5) : "");
  const s = trim(startTime);
  const e = trim(endTime);
  if (!s && !e) return null;
  return `${s} – ${e}`;
}

// ── Lookup tables ─────────────────────────────────────────────────────────

const AVAILABILITY_STYLES = {
  AVAILABLE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  UNAVAILABLE: "bg-zinc-100 text-zinc-500 border-zinc-200",
  ITEMS_UNAVAILABLE: "bg-amber-50 text-amber-700 border-amber-200",
  SCHEDULE_INACTIVE: "bg-violet-50 text-violet-700 border-violet-200",
  PREORDER_CLOSED: "bg-orange-50 text-orange-700 border-orange-200",
};

const TIME_SLOT_META = {
  BREAKFAST: { label: "Breakfast", icon: SunHorizonIcon },
  LUNCH: { label: "Lunch", icon: BowlFoodIcon },
  EVENING: { label: "Evening", icon: MoonIcon },
  FULL_DAY: { label: "All Day", icon: SunIcon },
  CUSTOM: { label: "Custom", icon: CalendarPlusIcon },
};

// ── Sub-components (matches PartyOrderCard's StatusBadge pattern) ──────────

function AvailabilityBadge({ status }) {
  if (!status) return null;
  const cls =
    AVAILABILITY_STYLES[status] ?? "bg-zinc-100 text-zinc-600 border-zinc-200";
  return (
    <Badge className={cn("capitalize", cls)}>
      {String(status).toLowerCase().replace(/_/g, " ")}
    </Badge>
  );
}

function StatusBadge({ status }) {
  if (!status) return null;
  const tone =
    {
      ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
      DRAFT: "bg-zinc-100 text-zinc-600 border-zinc-200",
      INACTIVE: "bg-zinc-100 text-zinc-500 border-zinc-200",
      DELETED: "bg-red-50 text-red-500 border-red-200",
    }[status] ?? "bg-zinc-100 text-zinc-600 border-zinc-200";
  return <Badge className={tone}>{status}</Badge>;
}

function VegBadge({ comboType }) {
  const isVeg = comboType === "VEG" || comboType === "MIXED";
  const isMixed = comboType === "MIXED";
  return (
    <Badge
      className={cn(
        isMixed
          ? "bg-amber-50 text-amber-700 border-amber-200"
          : isVeg
            ? "bg-emerald-50 text-emerald-600 border-emerald-200"
            : "bg-red-50 text-red-500 border-red-200",
      )}
    >
      {isMixed ? "Mixed" : isVeg ? "Veg" : "Non-Veg"}
    </Badge>
  );
}

function TimeSlotPill({ timeSlot }) {
  const meta = timeSlot ? TIME_SLOT_META[timeSlot] : null;
  const SlotIcon = meta?.icon ?? CalendarPlusIcon;
  const label = meta?.label ?? "Custom Schedule";
  return (
    <Badge variant="secondary">
      <SlotIcon weight="duotone" data-icon="inline-start" />
      {label}
    </Badge>
  );
}

function PriceBlock({ combo }) {
  const discount = combo.savingsPercentage
    ? Math.round(Number(combo.savingsPercentage))
    : 0;
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-base font-semibold leading-none">
        {formatCurrency(combo.comboPrice)}
      </span>
      {combo.originalPrice != null && Number(combo.originalPrice) > 0 && (
        <span className="text-xs text-muted-foreground line-through">
          {formatCurrency(combo.originalPrice)}
        </span>
      )}
      {discount > 0 && (
        <Badge className="text-emerald-700 bg-emerald-50 border border-emerald-200">
          {discount}% OFF
        </Badge>
      )}
    </div>
  );
}

function ComboImage({ combo }) {
  const src = combo.thumbnailUrl ?? combo.imageUrl;
  return (
    <div className="relative size-20 sm:w-20 sm:h-20 shrink-0 rounded-md overflow-hidden bg-muted">
      {src ? (
        <img
          src={src}
          alt={combo.comboName}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-primary/25 to-primary">
          <PackageIcon
            size={28}
            className="opacity-40 text-primary-foreground"
          />
        </div>
      )}
    </div>
  );
}

// ── Card ───────────────────────────────────────────────────────────────────

const ITEM_CHIP_LIMIT = 4;

export default function ComboCard({
  combo,
  onEdit,
  onDelete,
  onToggleActive,
  toggling,
  showFullDetails = false,
}) {
  const [itemsOpen, setItemsOpen] = useState(false);

  const itemNames = Array.isArray(combo.itemNames) ? combo.itemNames : [];

  return (
    <Card size="sm" className="overflow-hidden">
      {/* ── Header ──────────────────────────────────────────────── */}
      <CardHeader>
        <div className="flex items-start justify-between gap-2 min-w-0">
          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-1.5 flex-wrap mb-0.5">
              <h3 className="font-semibold text-sm sm:text-base truncate min-w-0">
                {combo.comboName}
              </h3>
              <div className="flex items-center gap-2">
                <VegBadge comboType={combo.comboType} />
                <TimeSlotPill
                  timeSlot={combo.timeSlot}
                />
                {showFullDetails && combo.categoryName && (
                  <Badge className="">
                    <TagIcon data-icon="inline-start" weight="bold" />
                    {combo.categoryName}
                  </Badge>
                )}
                {showFullDetails && <StatusBadge status={combo.status} />}
                {combo.isFeatured && (
                  <Badge className="bg-orange-600 text-white">
                    <StarIcon size={8} weight="fill" />
                    Featured
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="Combo actions"
              render={
                <Button variant="branded-secondary" size="icon-sm">
                  <DotsThreeVerticalIcon weight="bold" />
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => onEdit?.(combo)}>
                <PencilSimpleIcon data-icon="inline-start" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete?.(combo)}
                variant="destructive"
              >
                <TrashIcon data-icon="inline-start" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* ── Top row: image + price ─────────────────────────── */}
        <div className="flex items-start gap-3">
          <ComboImage combo={combo} />
          <div className="flex-1 min-w-0 flex flex-col gap-1.5">
            <PriceBlock combo={combo} />
            {/* List-card items summary (itemNames[]) */}
            {itemNames.length > 0 && (
              <p className="text-xs border p-2 rounded-sm bg-primary/5 text-secondary-foreground leading-snug">
                {itemNames.slice(0, 4).join(" + ")}
                {itemNames.length > 4 && ` +${itemNames.length - 4} more`}
              </p>
            )}
            {/* Full-response short description */}
            {combo.shortName && (
              <p className="text-[11px] text-muted-foreground line-clamp-1">
                <span className="font-medium">Short:</span> {combo.shortName}
              </p>
            )}
            {combo.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 leading-snug">
                {combo.description}
              </p>
            )}
          </div>
        </div>

        <div className="pt-3 border-t flex gap-2 items-center justify-between">
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            <AvailabilityBadge status={combo.availabilityStatus} />
            {combo.isPreorderEligible && (
              <Badge className="bg-sky-50 text-sky-700 border-sky-200">
                Pre-order
              </Badge>
            )}

            {combo.isSignatureCombo && (
              <Badge className="bg-violet-50 text-violet-700 border-violet-200">
                Signature
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

ComboCard.propTypes = {
  combo: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    comboName: PropTypes.string.isRequired,
    shortName: PropTypes.string,
    description: PropTypes.string,
    comboType: PropTypes.string,
    timeSlot: PropTypes.string,
    availabilityStatus: PropTypes.string,
    status: PropTypes.string,
    comboPrice: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    originalPrice: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    savingsPercentage: PropTypes.oneOfType([
      PropTypes.number,
      PropTypes.string,
    ]),
    imageUrl: PropTypes.string,
    thumbnailUrl: PropTypes.string,
    isFeatured: PropTypes.bool,
    isPreorderEligible: PropTypes.bool,
    isSignatureCombo: PropTypes.bool,
    isActive: PropTypes.bool,
    itemNames: PropTypes.arrayOf(PropTypes.string),
    items: PropTypes.array,
    schedules: PropTypes.array,
    signatureProducts: PropTypes.array,
    categoryName: PropTypes.string,
    createdAt: PropTypes.string,
    createdBy: PropTypes.string,
  }).isRequired,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
  onToggleActive: PropTypes.func,
  toggling: PropTypes.bool,
  showFullDetails: PropTypes.bool,
};
