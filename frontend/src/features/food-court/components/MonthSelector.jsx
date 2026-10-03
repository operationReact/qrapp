import { CalendarDays } from "lucide-react";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { buildMonthOptions } from "../format";

export function MonthSelector({ value, onChange, disabled }) {
  const options = buildMonthOptions(12);
  return (
    <div className="space-y-1">
      <Label className="text-[11px] font-semibold uppercase tracking-wide text-[var(--cc-muted-text)]">
        Month
      </Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="h-11 w-full min-w-[12rem] rounded-[10px] border-[var(--cc-border)] bg-white sm:w-56">
          <span className="flex items-center gap-2 truncate">
            <CalendarDays className="size-4 shrink-0 text-[var(--cc-muted-text)]" aria-hidden="true" />
            <SelectValue placeholder="Select a month" />
          </span>
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
