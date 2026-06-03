/**
 * ComboBoxCreate
 * A select-like dropdown that:
 *  - Shows existing options from `items` (array of { id, name })
 *  - Has a search/filter input at the top
 *  - Shows "+ Create '<typed value>'" when no match found (or always at bottom)
 *  - Calls `onSelect(name)` when an existing item is picked
 *  - Calls `onCreate(name)` when the create option is clicked
 */
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { CaretDownIcon, CheckIcon, PlusIcon } from "@phosphor-icons/react";

export default function ComboBoxCreate({
  items = [],           // [{ id, name }]
  value = "",           // currently selected name
  onSelect,             // (name: string) => void
  onCreate,             // (name: string) => Promise | void
  placeholder = "Select or create…",
  creating = false,     // show loading state on create
  className,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  const filtered = items.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  const exactMatch = items.some(
    (item) => item.name.toLowerCase() === search.toLowerCase()
  );

  const showCreate = search.trim().length > 0 && !exactMatch;

  const handleSelect = (item) => {
    onSelect(item); // passes { id, name }
    setOpen(false);
    setSearch("");
  };

  const handleCreate = async () => {
    if (!search.trim()) return;
    const created = await onCreate(search.trim()); // should return { id, name }
    onSelect(created && created.id ? created : { id: null, name: search.trim() });
    setOpen(false);
    setSearch("");
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <span className={value ? "text-foreground" : "text-muted-foreground"}>
          {value || placeholder}
        </span>
        <CaretDownIcon className={cn("size-4 shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
          {/* Search */}
          <div className="p-2 border-b">
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search or type to create…"
              className="w-full rounded-sm border border-input bg-transparent px-2 py-1 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          <ul className="max-h-48 overflow-y-auto py-1">
            {filtered.length === 0 && !showCreate && (
              <li className="px-3 py-2 text-sm text-muted-foreground italic">
                No options found
              </li>
            )}
            {filtered.map((item) => (
              <li
                key={item.id}
                className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
                onClick={() => handleSelect(item)}
              >
                <CheckIcon
                  className={cn(
                    "size-3.5 shrink-0",
                    value === item.name ? "opacity-100" : "opacity-0"
                  )}
                />
                {item.name}
              </li>
            ))}

            {/* Create new option */}
            {showCreate && (
              <li
                className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/5 border-t"
                onClick={handleCreate}
              >
                <PlusIcon className="size-3.5 shrink-0" />
                {creating ? "Creating…" : `Create "${search.trim()}"`}
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

