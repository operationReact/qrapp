import { Building2 } from "lucide-react";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function foodCourtLabel(court) {
  if (!court) return "";
  const name = court.name || court.title || `Food Court ${court.id}`;
  const place = court.location || court.city || court.address;
  return place ? `${name} · ${place}` : name;
}

export function FoodCourtSelector({ foodCourts, value, onChange, disabled }) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] font-semibold uppercase tracking-wide text-[var(--cc-muted-text)]">
        Food Court
      </Label>
      <Select value={value ? String(value) : ""} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="h-11 w-full min-w-[14rem] rounded-[10px] border-[var(--cc-border)] bg-white sm:w-72">
          <span className="flex items-center gap-2 truncate">
            <Building2 className="size-4 shrink-0 text-[var(--cc-muted-text)]" aria-hidden="true" />
            <SelectValue placeholder="Select a food court" />
          </span>
        </SelectTrigger>
        <SelectContent>
          {(foodCourts || []).map((court) => (
            <SelectItem key={court.id} value={String(court.id)}>
              {foodCourtLabel(court)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
