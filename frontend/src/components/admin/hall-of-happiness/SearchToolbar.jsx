import React from "react";
import { MagnifyingGlassIcon, FunnelIcon } from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function SearchToolbar({ search, onSearchChange, onFilterClick, activeFilterCount }) {
  return (
    <div className="flex gap-2">
      <div className="flex-1 relative">
        <MagnifyingGlassIcon
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
        />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search memories..."
          className="pl-10 h-10"
        />
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onFilterClick}
        className="relative"
      >
        <FunnelIcon size={18} />
        {activeFilterCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-[var(--cc-warning)] text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {activeFilterCount}
          </span>
        )}
      </Button>
    </div>
  );
}
