import { useState, useRef, useEffect } from "react";
import { Field, FieldLabel, FieldContent } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createPartyOrder } from "@/services/party-order-service";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Minus, Plus, CheckCircle, X, ChevronDown } from "lucide-react";
import {
  CalendarIcon,
  UsersThreeIcon,
  ConfettiIcon,
  MapPinIcon,
  ListBulletsIcon,
  NoteIcon,
} from "@phosphor-icons/react";

// ── Local suggestions ────────────────────────────────────────────────────────
const MENU_SUGGESTIONS = [
  "Veg Biryani", "Chicken Biryani", "Mutton Biryani",
  "Chicken Curry", "Mutton Curry", "Paneer Butter Masala",
  "Dal Makhani", "Palak Paneer", "Chole Bhature",
  "Veg Fried Rice", "Chicken Fried Rice",
  "Butter Naan", "Tandoori Roti",
  "Live Dosa Counter", "Live Paratha Counter",
  "Apricot Delight", "Gulab Jamun", "Rasgulla",
  "Mango Halwa", "Kheer", "Jalebi",
  "Samosa", "Veg Pakora", "Chicken Tikka", "Seekh Kebab",
  "Raita", "Salad Counter", "Masala Chaas", "Fresh Lime Soda",
];

const EVENT_TYPES = [
  "Birthday", "Wedding", "Corporate", "Housewarming",
  "Engagement", "Anniversary", "Baby Shower", "Other",
];

function getLocalDateTimeString() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

// ── MenuItemTagInput ─────────────────────────────────────────────────────────
function MenuItemTagInput({ value = [], onChange, error }) {
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(-1);
  const inputRef = useRef(null);
  const wrapRef = useRef(null);

  const filtered = input.trim()
    ? MENU_SUGGESTIONS.filter(
        (s) =>
          s.toLowerCase().includes(input.trim().toLowerCase()) &&
          !value.includes(s)
      )
    : [];

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false); setHi(-1);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const add = (raw) => {
    const v = raw.trim().replace(/,$/, "").trim();
    if (!v || value.some((x) => x.toLowerCase() === v.toLowerCase())) {
      setInput(""); return;
    }
    onChange([...value, v]);
    setInput(""); setOpen(false); setHi(-1);
    inputRef.current?.focus();
  };

  const remove = (i) => { onChange(value.filter((_, idx) => idx !== i)); inputRef.current?.focus(); };

  const onKey = (e) => {
    if (e.key === "Enter") { e.preventDefault(); hi >= 0 && filtered[hi] ? add(filtered[hi]) : input.trim() && add(input); }
    else if (e.key === "Backspace" && !input && value.length > 0) remove(value.length - 1);
    else if (e.key === "ArrowDown") { e.preventDefault(); setHi((i) => Math.min(i + 1, filtered.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHi((i) => Math.max(i - 1, -1)); }
    else if (e.key === "Escape") { setOpen(false); setHi(-1); }
    else if (e.key === ",") { e.preventDefault(); input.trim() && add(input); }
  };

  return (
    <div ref={wrapRef} className="relative">
      <div
        onClick={() => inputRef.current?.focus()}
        className={cn(
          "flex flex-wrap gap-1.5 min-h-[48px] w-full rounded-lg border bg-background px-3 py-2 text-sm cursor-text",
          "focus-within:ring-2 focus-within:ring-ring/50 transition-all",
          error ? "border-destructive" : "border-input"
        )}
      >
        {value.map((item, i) => (
          <span key={i} className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-medium">
            {item}
            <button type="button" onClick={(e) => { e.stopPropagation(); remove(i); }}
              className="rounded-full hover:bg-primary/20 p-0.5 transition-colors">
              <X size={9} strokeWidth={3} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => { setInput(e.target.value); setOpen(true); setHi(-1); }}
          onKeyDown={onKey}
          onFocus={() => input.trim() && setOpen(true)}
          placeholder={value.length === 0 ? "Type and press Enter to add…" : "Add more…"}
          className="flex-1 min-w-[140px] bg-transparent outline-none placeholder:text-muted-foreground text-sm py-0.5"
          autoComplete="off"
        />
      </div>
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full rounded-lg border border-input bg-popover shadow-lg max-h-48 overflow-y-auto py-1">
          {filtered.map((s, i) => (
            <li key={s}
              className={cn("px-3 py-2 text-sm cursor-pointer", i === hi ? "bg-accent text-accent-foreground" : "hover:bg-accent hover:text-accent-foreground")}
              onMouseEnter={() => setHi(i)}
              onMouseDown={(e) => { e.preventDefault(); add(s); }}
            >{s}</li>
          ))}
        </ul>
      )}
      {error
        ? <p className="mt-1 text-xs text-destructive">{error}</p>
        : <p className="mt-1 text-xs text-muted-foreground">Press <kbd className="font-mono bg-muted px-1 rounded text-[10px]">Enter</kbd> or <kbd className="font-mono bg-muted px-1 rounded text-[10px]">,</kbd> to add. Backspace removes last.</p>
      }
    </div>
  );
}

// ── PeopleStepper ────────────────────────────────────────────────────────────
function PeopleStepper({ value, onChange, error }) {
  const num = Number(value) || 0;
  const step = (delta) => onChange(String(Math.max(10, num + delta)));
  return (
    <div>
      <div className={cn("flex items-center rounded-lg border overflow-hidden", error ? "border-destructive" : "border-input")}>
        <button type="button" onClick={() => step(-10)}
          className="px-3 py-2.5 hover:bg-muted transition-colors border-r border-input text-muted-foreground hover:text-foreground">
          <Minus size={14} />
        </button>
        <input
          type="number" min="10" value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 text-center bg-transparent outline-none text-sm py-2.5 font-medium [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
          placeholder="50"
        />
        <button type="button" onClick={() => step(10)}
          className="px-3 py-2.5 hover:bg-muted transition-colors border-l border-input text-muted-foreground hover:text-foreground">
          <Plus size={14} />
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

// ── EventTypeSelect ──────────────────────────────────────────────────────────
function EventTypeSelect({ value, onChange, error }) {
  return (
    <div>
      <div className={cn("relative rounded-lg border", error ? "border-destructive" : "border-input")}>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent px-3 py-2.5 text-sm outline-none appearance-none pr-8 text-foreground"
        >
          <option value="">Select event type…</option>
          {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
      </div>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

// ── SuccessScreen ────────────────────────────────────────────────────────────
function SuccessScreen({ onClose }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center gap-4">
      <div className="rounded-full bg-emerald-50 p-4">
        <CheckCircle size={40} className="text-emerald-500" strokeWidth={1.5} />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-foreground">Request Submitted!</h3>
        <p className="mt-1.5 text-sm text-muted-foreground max-w-xs">
          Our team will review your requirements and contact you shortly with an estimate.
        </p>
      </div>
      <div className="flex flex-col gap-2 w-full max-w-xs mt-2">
        <Button onClick={onClose} className="w-full">Done</Button>
      </div>
    </div>
  );
}

// ── Main Form ────────────────────────────────────────────────────────────────
export default function NewPartyOrder({ className, onClose }) {
  const [eventDateTime, setEventDateTime] = useState("");
  const [numberOfPeople, setNumberOfPeople] = useState("50");
  const [menuItems, setMenuItems] = useState([]);
  const [venue, setVenue] = useState("");
  const [eventType, setEventType] = useState("");
  const [specialNotes, setSpecialNotes] = useState("");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const queryClient = useQueryClient();

  const createOrder = useMutation({
    mutationFn: createPartyOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["party-orders"] });
      setSubmitted(true);
    },
    onError: (err) => {
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Failed to submit. Please try again.";
      toast.error(message);
    },
  });

  if (submitted) return <SuccessScreen onClose={onClose} />;

  const validate = () => {
    const e = {};
    if (!eventDateTime) e.eventDateTime = "Event date and time is required";
    else if (new Date(eventDateTime) <= new Date()) e.eventDateTime = "Event date must be in the future";
    if (!numberOfPeople || Number(numberOfPeople) < 10) e.numberOfPeople = "Minimum 10 people required";
    if (menuItems.length === 0) e.menuItems = "Add at least one menu item";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    const clean = [...new Set(menuItems.map((i) => i.trim()).filter(Boolean))];
    createOrder.mutate({
      eventDateTime: new Date(eventDateTime).toISOString().slice(0, 19),
      numberOfPeople: Number(numberOfPeople),
      menuItems: clean,
      venue: venue.trim() || undefined,
      eventType: eventType || undefined,
      specialNotes: specialNotes.trim() || undefined,
      budgetAmount: budgetAmount ? Number(budgetAmount) : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-4", className)}>

      {/* ── Row 1: Event Date + People ─────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field>
          <FieldLabel className="flex items-center gap-1.5">
            <CalendarIcon weight="bold" className="size-3.5 text-primary" />
            Event Date &amp; Time
          </FieldLabel>
          <FieldContent>
            <Input
              type="datetime-local"
              value={eventDateTime}
              onChange={(e) => setEventDateTime(e.target.value)}
              min={getLocalDateTimeString()}
              className={cn(errors.eventDateTime && "border-destructive")}
            />
            {errors.eventDateTime && <p className="text-xs text-destructive mt-1">{errors.eventDateTime}</p>}
          </FieldContent>
        </Field>

        <Field>
          <FieldLabel className="flex items-center gap-1.5">
            <UsersThreeIcon weight="bold" className="size-3.5 text-primary" />
            Number of People
          </FieldLabel>
          <FieldContent>
            <PeopleStepper value={numberOfPeople} onChange={setNumberOfPeople} error={errors.numberOfPeople} />
          </FieldContent>
        </Field>
      </div>

      {/* ── Row 2: Event Type + Venue ──────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field>
          <FieldLabel className="flex items-center gap-1.5">
            <ConfettiIcon weight="bold" className="size-3.5 text-primary" />
            Event Type
          </FieldLabel>
          <FieldContent>
            <EventTypeSelect value={eventType} onChange={setEventType} error={errors.eventType} />
          </FieldContent>
        </Field>

        <Field>
          <FieldLabel className="flex items-center gap-1.5">
            <MapPinIcon weight="bold" className="size-3.5 text-primary" />
            Venue / Area
          </FieldLabel>
          <FieldContent>
            <Input
              placeholder="e.g. Madhapur, Hyderabad"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">Where should we serve?</p>
          </FieldContent>
        </Field>
      </div>

      {/* ── Row 3: Budget ──────────────────────────────────────────────── */}
      <Field>
        <FieldLabel className="flex items-center gap-1.5">
          Budget <span className="text-muted-foreground font-normal">(optional)</span>
        </FieldLabel>
        <FieldContent>
          <Input
            type="number"
            min="0"
            step="1000"
            placeholder="e.g. 25000"
            value={budgetAmount}
            onChange={(e) => setBudgetAmount(e.target.value)}
          />
          <p className="text-xs text-muted-foreground mt-1">Your approximate budget in ₹ (helps us tailor the estimate)</p>
        </FieldContent>
      </Field>

      {/* ── Preferred Menu ─────────────────────────────────────────────── */}
      <Field>
        <FieldLabel className="flex items-center gap-1.5">
          <ListBulletsIcon weight="bold" className="size-3.5 text-primary" />
          Preferred Menu
        </FieldLabel>
        <FieldContent>
          <MenuItemTagInput value={menuItems} onChange={setMenuItems} error={errors.menuItems} />
        </FieldContent>
      </Field>

      {/* ── Special Notes ──────────────────────────────────────────────── */}
      <Field>
        <FieldLabel className="flex items-center gap-1.5">
          <NoteIcon weight="bold" className="size-3.5 text-primary" />
          Special Notes <span className="text-muted-foreground font-normal">(optional)</span>
        </FieldLabel>
        <FieldContent>
          <textarea
            rows={3}
            placeholder="Serving staff, live counters, sweet preferences, dietary restrictions…"
            value={specialNotes}
            onChange={(e) => setSpecialNotes(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm resize-none outline-none focus:ring-2 focus:ring-ring/50 placeholder:text-muted-foreground transition-all"
          />
        </FieldContent>
      </Field>

      {/* ── Submit ─────────────────────────────────────────────────────── */}
      <Button type="submit" className="w-full h-11 text-sm font-medium" disabled={createOrder.isPending}>
        {createOrder.isPending ? "Submitting…" : "Request Estimate"}
      </Button>
    </form>
  );
}
