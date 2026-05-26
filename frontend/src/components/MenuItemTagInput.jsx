import { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Local suggestion list (no backend calls) ────────────────────────────────
const MENU_SUGGESTIONS = [
  "Veg Biryani",
  "Chicken Biryani",
  "Mutton Biryani",
  "Chicken Curry",
  "Mutton Curry",
  "Paneer Butter Masala",
  "Dal Makhani",
  "Palak Paneer",
  "Chole Bhature",
  "Veg Fried Rice",
  "Chicken Fried Rice",
  "Butter Naan",
  "Tandoori Roti",
  "Live Dosa Counter",
  "Live Paratha Counter",
  "Apricot Delight",
  "Gulab Jamun",
  "Rasgulla",
  "Mango Halwa",
  "Kheer",
  "Jalebi",
  "Samosa",
  "Veg Pakora",
  "Chicken Tikka",
  "Seekh Kebab",
  "Raita",
  "Salad Counter",
  "Masala Chaas",
  "Fresh Lime Soda",
];

/**
 * MenuItemTagInput
 * A chip/tag input component that lets users type custom items or pick from
 * local suggestions. No backend calls — fully offline filtering.
 *
 * Props:
 *   value        — string[]  (controlled)
 *   onChange     — (string[]) => void
 *   error        — string | undefined
 *   placeholder  — string
 */
export default function MenuItemTagInput({
  value = [],
  onChange,
  error,
  placeholder = "Type menu items and press Enter…",
}) {
  const [inputValue, setInputValue] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  // ── Filter suggestions ────────────────────────────────────────────────────
  const filtered = inputValue.trim()
    ? MENU_SUGGESTIONS.filter(
        (s) =>
          s.toLowerCase().includes(inputValue.trim().toLowerCase()) &&
          !value.includes(s)
      )
    : [];

  // ── Close dropdown on outside click ──────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowDropdown(false);
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Add item ──────────────────────────────────────────────────────────────
  const addItem = (raw) => {
    const trimmed = raw.trim().replace(/,$/, "").trim(); // strip trailing comma
    if (!trimmed) return;
    // Deduplicate (case-insensitive display, preserve casing)
    if (value.some((v) => v.toLowerCase() === trimmed.toLowerCase())) {
      setInputValue("");
      return;
    }
    onChange([...value, trimmed]);
    setInputValue("");
    setShowDropdown(false);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  // ── Remove item ───────────────────────────────────────────────────────────
  const removeItem = (index) => {
    onChange(value.filter((_, i) => i !== index));
    inputRef.current?.focus();
  };

  // ── Keyboard navigation ───────────────────────────────────────────────────
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0 && filtered[highlightedIndex]) {
        addItem(filtered[highlightedIndex]);
      } else if (inputValue.trim()) {
        addItem(inputValue);
      }
    } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
      removeItem(value.length - 1);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Escape") {
      setShowDropdown(false);
      setHighlightedIndex(-1);
    } else if (e.key === ",") {
      e.preventDefault();
      if (inputValue.trim()) addItem(inputValue);
    }
  };

  const handleChange = (e) => {
    setInputValue(e.target.value);
    setShowDropdown(true);
    setHighlightedIndex(-1);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* ── Tag container + input ─────────────────────────────────────────── */}
      <div
        className={cn(
          "flex flex-wrap gap-1.5 min-h-[44px] w-full rounded-md border bg-background px-3 py-2 text-sm",
          "focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-0",
          "cursor-text transition-colors",
          error
            ? "border-destructive focus-within:ring-destructive"
            : "border-input"
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {/* Chips */}
        {value.map((item, index) => (
          <span
            key={index}
            className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-medium leading-none select-none"
          >
            {item}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeItem(index);
              }}
              className="rounded-full hover:bg-primary/20 p-0.5 transition-colors"
              aria-label={`Remove ${item}`}
            >
              <X size={10} strokeWidth={2.5} />
            </button>
          </span>
        ))}

        {/* Text input */}
        <input
          ref={inputRef}
          value={inputValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => inputValue.trim() && setShowDropdown(true)}
          placeholder={value.length === 0 ? placeholder : "Add more…"}
          className="flex-1 min-w-[140px] bg-transparent outline-none placeholder:text-muted-foreground text-sm py-0.5"
          aria-autocomplete="list"
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      {/* ── Suggestions dropdown ──────────────────────────────────────────── */}
      {showDropdown && filtered.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-50 mt-1 w-full rounded-md border border-input bg-popover shadow-md max-h-52 overflow-y-auto py-1"
        >
          {filtered.map((suggestion, idx) => (
            <li
              key={suggestion}
              role="option"
              aria-selected={idx === highlightedIndex}
              className={cn(
                "px-3 py-2 text-sm cursor-pointer select-none",
                idx === highlightedIndex
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent hover:text-accent-foreground"
              )}
              onMouseEnter={() => setHighlightedIndex(idx)}
              onMouseDown={(e) => {
                e.preventDefault(); // prevent blur
                addItem(suggestion);
              }}
            >
              {suggestion}
            </li>
          ))}
        </ul>
      )}

      {/* ── Helper / error text ───────────────────────────────────────────── */}
      {error ? (
        <p className="mt-1 text-xs text-destructive">{error}</p>
      ) : (
        <p className="mt-1 text-xs text-muted-foreground">
          Press <kbd className="font-mono bg-muted px-1 rounded text-[10px]">Enter</kbd> or{" "}
          <kbd className="font-mono bg-muted px-1 rounded text-[10px]">,</kbd> to add.
          Use <kbd className="font-mono bg-muted px-1 rounded text-[10px]">↑↓</kbd> to navigate suggestions.
        </p>
      )}
    </div>
  );
}

