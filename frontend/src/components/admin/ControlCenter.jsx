import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "@tanstack/react-router";
import { toast } from "sonner";
import { Bell, Building2, Check, ChevronDown, ChevronRight, CreditCard, Globe2, IndianRupee, KeyRound, MapPin, Menu, MoreVertical, Plus, ShieldCheck, Store, Users, UsersRound, Wallet, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useSidebar } from "@/components/ui/sidebar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAdminDashboard } from "@/context/AdminDashboardContext";
import { useLocation as useActiveLocation } from "@/context/LocationContext";
import { ROLE } from "@/lib/roles";
import { adminSettingsOptions, paymentConfigOptions } from "@/query/options/orders";
import { adminSetPayAtStall } from "@/services/order-service";
import { adminCustomerCompaniesOptions, adminLocationsOptions, adminUsersOptions, adminVendorsOptions, assignCustomerCompany, createManagementResource, grantUserLocation, locationCustomerCompaniesOptions, removeCustomerCompany, revokeUserLocation, updateCustomerCompany, updateUserRole, userLocationsOptions } from "@/query/options/management";

// Existing routes/tabs are preserved 1:1 — only the presentation changed.
const links = [
  { to: "/admin/control-center", label: "Overview", icon: ShieldCheck },
  { to: "/admin/control-center/users", label: "Users", icon: Users },
  { to: "/admin/control-center/locations", label: "Locations", icon: Building2 },
  { to: "/admin/control-center/customer-companies", label: "Customer Companies", icon: UsersRound },
  { to: "/admin/control-center/access", label: "Access Management", icon: KeyRound },
  { to: "/admin/control-center/payments", label: "Payments", icon: CreditCard },
];

// Compact 64px header: hamburger (opens the same admin sidebar), page title,
// and a bell reusing the exact notification-count logic already used by the
// generic admin sub-page header (delayed + placed orders).
function ControlCenterHeader() {
  const { toggleSidebar } = useSidebar();
  const { dashboard } = useAdminDashboard();
  const notifCount = Math.min((dashboard?.delayedOrders ?? 0) + (dashboard?.placedOrders ?? 0), 9);
  return (
    <header className="sticky top-0 z-40 border-b border-[#E7DED2] bg-[#FBF9F5]/95 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between px-4">
        <button type="button" onClick={toggleSidebar} aria-label="Open menu" className="grid size-11 shrink-0 place-items-center rounded-xl text-[#29231E] transition-colors hover:bg-[#F3E7D3]">
          <Menu className="size-6" aria-hidden="true" />
        </button>
        <h1 className="min-w-0 truncate text-[18px] font-semibold text-[#29231E]">Control Center</h1>
        <button type="button" aria-label="Notifications" className="relative grid size-11 shrink-0 place-items-center rounded-xl text-[#29231E] transition-colors hover:bg-[#F3E7D3]">
          <Bell className="size-6" aria-hidden="true" />
          {notifCount > 0 && <span className="absolute top-1.5 right-1.5 flex size-4 items-center justify-center rounded-full bg-[#E51B23] text-[9px] font-bold leading-none text-white">{notifCount}</span>}
        </button>
      </div>
    </header>
  );
}

function ControlCenterTabs() {
  const { pathname } = useLocation();
  return (
    <nav aria-label="Super Admin control center" className="mx-4 my-3 overflow-x-auto rounded-2xl border border-[#E7DED2] bg-[#FFFDFC] p-1 no-scrollbar">
      <div className="flex min-w-max gap-1">
        {links.map(({ to, label }) => {
          const active = pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className={`flex h-10 shrink-0 items-center justify-center whitespace-nowrap rounded-xl px-3.5 text-[13px] font-medium transition-colors ${active ? "bg-[#29231E] text-white" : "text-[#29231E] hover:bg-[#F7F3EC]"}`}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function Shell({ title, description, children }) {
  return (
    <main className="mx-auto w-full max-w-7xl bg-[#FBF9F5] pb-8">
      <ControlCenterHeader />
      <ControlCenterTabs />
      <div className="space-y-4 px-4">
        {title && (
          <div>
            <h2 className="text-[18px] font-semibold text-[#29231E]">{title}</h2>
            {description && <p className="mt-0.5 text-[13px] text-[#756E66]">{description}</p>}
          </div>
        )}
        {children}
      </div>
    </main>
  );
}

function ErrorState({ error }) { return error ? <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Unable to load this data. {error.message}</p> : null; }
function Items({ items, empty = "No records found." }) {
  if (!items?.length) return <p className="py-8 text-center text-sm text-zinc-500">{empty}</p>;
  return <div className="grid gap-3 sm:grid-cols-2">{items.map((item, index) => <Card key={item.id ?? index} size="sm"><CardContent className="flex items-center justify-between gap-3 p-4"><div className="min-w-0"><p className="truncate font-semibold text-zinc-900">{item.name || item.email || item.username || item.title || `Record ${index + 1}`}</p><p className="truncate text-xs text-zinc-500">{item.email || item.code || item.description || item.status || "Active"}</p></div><span className="shrink-0 rounded-full bg-zinc-100 px-2 py-1 text-[10px] font-bold uppercase text-zinc-500">{item.role || item.type || "Active"}</span></CardContent></Card>)}</div>;
}

// Reusable, config-driven presentation for a management area. Passing
// `wide: true` renders the full-width single-row variant (used today by
// Payment Management); everything else renders the 2-column stat tile.
// Adding a future module (e.g. Vendor Management) only requires one more
// entry in the `cards` array below — no new layout component.
function ManagementCard({ to, icon, title, count, description, wide }) {
  const Icon = icon;
  if (wide) {
    return (
      <Link to={to} className="col-span-2 flex min-h-[92px] items-center gap-3 rounded-2xl border border-[#E7DED2] bg-[#FFFDFC] p-3.5 transition hover:border-[#E51B23]/30">
        <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#FFF0F0] text-[#E51B23]">
          <Icon className="size-[21px]" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 text-[15px] font-semibold text-[#29231E]">{title}</p>
          <p className="mt-0.5 truncate text-[11px] text-[#756E66]">{description}</p>
        </div>
        <ChevronRight className="size-4 shrink-0 text-[#756E66]" aria-hidden="true" />
      </Link>
    );
  }
  return (
    <Link to={to} className="flex min-h-[132px] flex-col rounded-2xl border border-[#E7DED2] bg-[#FFFDFC] p-3.5 transition hover:border-[#E51B23]/30">
      <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#FFF0F0] text-[#E51B23]">
        <Icon className="size-5" aria-hidden="true" />
      </div>
      <p className="mt-2 text-sm font-semibold text-[#29231E]">{title}</p>
      <p className="text-[26px] font-bold leading-tight text-[#29231E]">{count}</p>
      <p className="mt-auto text-[11px] leading-snug text-[#756E66]">{description}</p>
    </Link>
  );
}

function QuickAction({ to, icon, label }) {
  const Icon = icon;
  return (
    <Link to={to} className="flex min-w-[72px] shrink-0 flex-col items-center gap-1.5 rounded-2xl border border-[#E7DED2] bg-[#FFFDFC] px-3 py-2.5 text-center transition hover:border-[#E51B23]/30">
      <div className="grid size-9 place-items-center rounded-xl bg-[#FFF0F0] text-[#E51B23]">
        <Icon className="size-5" aria-hidden="true" />
      </div>
      <span className="text-[11px] font-medium leading-tight text-[#29231E]">{label}</span>
    </Link>
  );
}

export function ControlCenterOverview() {
  const { data: users = [] } = useQuery(adminUsersOptions());
  const { data: locations = [] } = useQuery(adminLocationsOptions());
  const { data: companies = [] } = useQuery(adminCustomerCompaniesOptions());
  const { data: vendors = [] } = useQuery(adminVendorsOptions());

  // Config-driven cards — add a future module (e.g. Vendor Management) by
  // appending one entry here rather than building a new layout.
  const cards = [
    { to: "/admin/control-center/users", title: "Users", count: users.length, icon: Users, description: "Manage administrator access" },
    { to: "/admin/control-center/locations", title: "Locations", count: locations.length, icon: Building2, description: "Create and manage operating locations" },
    { to: "/admin/control-center/customer-companies", title: "Customer Companies", count: companies.length, icon: UsersRound, description: "Manage companies and assignments" },
    { to: "/admin/vendors", title: "Vendors", count: vendors.length, icon: Store, description: "Manage vendors, assignments and costs" },
    { to: "/admin/control-center/access", title: "Access Management", count: "—", icon: KeyRound, description: "Manage roles and location access" },
    { to: "/admin/control-center/payments", title: "Payment Management", icon: CreditCard, description: "Configure available payment methods", wide: true },
  ];

  // Only expose quick actions for functionality that already exists today.
  const quickActions = [
    { to: "/admin/control-center/locations", icon: Plus, label: "Add Location" },
    { to: "/admin/control-center/customer-companies", icon: Building2, label: "Add Customer Company" },
    { to: "/admin/control-center/access", icon: KeyRound, label: "Manage Access" },
  ];

  return <Shell>
    <div>
      <h2 className="text-[18px] font-semibold text-[#29231E]">Overview</h2>
      <p className="mt-0.5 text-[13px] text-[#756E66]">Key management areas</p>
    </div>
    <div className="grid grid-cols-2 gap-2.5">
      {cards.map((card) => <ManagementCard key={card.to} {...card} />)}
    </div>
    <div>
      <div className="mb-2 flex items-center gap-1.5 text-[#29231E]">
        <Zap className="size-4 text-[#B88746]" aria-hidden="true" />
        <h3 className="text-sm font-semibold">Quick Actions</h3>
      </div>
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {quickActions.map((action) => <QuickAction key={action.label} {...action} />)}
      </div>
    </div>
  </Shell>;
}

export function ControlCenterUsers() {
  const { data = [], isLoading, error } = useQuery(adminUsersOptions());
  return <Shell title="Users" description="Review administrator accounts and manage access from the Access Management screen."><Card><CardHeader><CardTitle>Administrator accounts</CardTitle></CardHeader><CardContent>{isLoading ? <p className="text-sm text-zinc-500">Loading users…</p> : <Items items={data} />}{<ErrorState error={error} />}</CardContent></Card></Shell>;
}

export function ControlCenterLocations() {
  const { data = [], isLoading, error } = useQuery(adminLocationsOptions());
  const { activeLocation } = useActiveLocation();
  const [form, setForm] = useState({ name: "", code: "", address: "" });
  const queryClient = useQueryClient();
  const generatedCode = `LOC-${form.name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "")}-001`;
  const mutation = useMutation({
    mutationFn: () => createManagementResource("/api/admin/locations", { ...form, name: form.name.trim(), code: (form.code.trim() || generatedCode), address: form.address.trim(), active: true }),
    onSuccess: () => { setForm({ name: "", code: "", address: "" }); queryClient.invalidateQueries({ queryKey: ["admin", "locations"] }); },
  });
  const apiError = mutation.error?.response?.status === 409
    ? "A location with this code already exists."
    : mutation.error?.response?.status === 403
      ? "Only a Super Admin can add locations."
      : mutation.error?.response?.data?.message || mutation.error?.response?.data || mutation.error?.message;
  return <Shell title="Locations" description="Create operating locations and make them available to registration, access management, and company assignments.">
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,.9fr)]">
      <Card className="border-zinc-200 shadow-sm"><CardHeader><CardTitle>Add a location</CardTitle><p className="text-sm text-zinc-500">Use a unique code that remains stable for integrations.</p></CardHeader><CardContent>
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); if (form.name.trim() && (form.code.trim() || generatedCode)) mutation.mutate(); }}>
          <Input className="min-h-11" required placeholder="Location name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value, code: current.code || `LOC-${event.target.value.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "")}-001` }))} />
          <Input className="min-h-11" required placeholder="Location code" value={form.code} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))} />
          <Input className="min-h-11 sm:col-span-2" placeholder="Address (optional)" value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} />
          <Button type="submit" className="min-h-11 sm:col-span-2" disabled={mutation.isPending}>{mutation.isPending ? "Adding location…" : "Add location"}</Button>
        </form>
        {apiError && <p className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{apiError}</p>}
      </CardContent></Card>
      <Card className="border-zinc-200 bg-primary/5 shadow-sm"><CardHeader><CardTitle>Current location</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-zinc-950">{activeLocation?.name || "Not selected"}</p><p className="mt-2 text-sm text-zinc-600">Use the location selector to change the active operating context.</p></CardContent></Card>
    </div>
    <Card className="border-zinc-200 shadow-sm"><CardHeader><CardTitle>Configured locations</CardTitle></CardHeader><CardContent>{isLoading ? <p className="text-sm text-zinc-500">Loading locations…</p> : <Items items={data} empty="No locations are configured." />}<ErrorState error={error} /></CardContent></Card>
  </Shell>;
}

// Compact location-context selector — the Super Admin picks a location first,
// then manages/assigns Customer Companies within that context (mirrors the
// existing location-scoping pattern used across the admin app, but scoped
// locally to this page — it intentionally does not touch the global
// LocationContext used for orders/menu).
const ALL_LOCATIONS_VALUE = "ALL";
function CompanyLocationSelector({ locations, value, onChange }) {
  const [open, setOpen] = useState(false);
  const selected = locations.find((location) => String(location.id) === value);
  const label = value === ALL_LOCATIONS_VALUE ? "All Locations" : selected?.name || "Select location";
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex h-10 w-full min-w-[150px] items-center gap-1.5 rounded-full border border-[#E7DED2] bg-[#FFFDFC] px-3 text-left"
      >
        <MapPin className="size-[15px] shrink-0 text-[#B88746]" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate text-xs font-medium text-[#29231E]">{label}</span>
        <ChevronDown className={`size-3.5 shrink-0 text-[#756E66] transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+6px)] z-20 max-h-64 w-56 overflow-y-auto rounded-2xl border border-[#E7DED2] bg-[#FFFDFC] p-1.5 shadow-lg">
          <button type="button" className={`flex min-h-11 w-full items-center gap-2 rounded-xl px-2.5 text-left text-sm ${value === ALL_LOCATIONS_VALUE ? "bg-[#FFF0F0] font-semibold text-[#E51B23]" : "text-[#29231E] hover:bg-[#F7F3EC]"}`} onClick={() => { onChange(ALL_LOCATIONS_VALUE); setOpen(false); }}>
            <Globe2 className="size-4 shrink-0" aria-hidden="true" /><span className="flex-1">All Locations</span>{value === ALL_LOCATIONS_VALUE && <Check className="size-4" aria-hidden="true" />}
          </button>
          {locations.map((location) => {
            const active = String(location.id) === value;
            return (
              <button key={location.id} type="button" className={`flex min-h-11 w-full items-center gap-2 rounded-xl px-2.5 text-left text-sm ${active ? "bg-[#FFF0F0] font-semibold text-[#E51B23]" : "text-[#29231E] hover:bg-[#F7F3EC]"}`} onClick={() => { onChange(String(location.id)); setOpen(false); }}>
                <MapPin className="size-4 shrink-0" aria-hidden="true" /><span className="flex-1 truncate">{location.name}</span>{active && <Check className="size-4" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CompanyRow({ company, subtitle, onEdit, onToggleActive, onRemove, busy }) {
  return (
    <div className="flex min-h-16 items-center gap-3 border-b border-[#E7DED2] px-3 py-3 last:border-0">
      <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#FFF0F0] text-[#E51B23]">
        <Building2 className="size-[18px]" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[#29231E]">{company.name}</p>
        <p className="truncate text-[11px] text-[#756E66]">{subtitle}</p>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger className="grid size-11 shrink-0 place-items-center rounded-xl text-[#756E66] hover:bg-[#F7F3EC]" aria-label={`Actions for ${company.name}`} disabled={busy}>
          <MoreVertical className="size-[18px]" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEdit}>Edit name</DropdownMenuItem>
          <DropdownMenuItem onClick={onToggleActive}>{company.active ? "Deactivate" : "Activate"}</DropdownMenuItem>
          {onRemove && <DropdownMenuItem variant="destructive" onClick={onRemove}>Remove from location</DropdownMenuItem>}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

const COMPANY_NAME_MIN = 2;
const COMPANY_NAME_MAX = 150;

export function CustomerCompanies() {
  const { data: companies = [], isLoading: companiesLoading, error: companiesError } = useQuery(adminCustomerCompaniesOptions());
  const { data: locations = [], isLoading: locationsLoading, error: locationsError } = useQuery(adminLocationsOptions());
  const [name, setName] = useState("");
  const [selectedLocationId, setSelectedLocationId] = useState(ALL_LOCATIONS_VALUE);
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const queryClient = useQueryClient();

  const isAllLocations = selectedLocationId === ALL_LOCATIONS_VALUE;
  const selectedLocation = locations.find((location) => String(location.id) === selectedLocationId);
  const assignedQuery = useQuery(locationCustomerCompaniesOptions(isAllLocations ? null : selectedLocationId));
  const assignedIds = new Set((assignedQuery.data || []).map((company) => String(company.id)));

  // What the list actually shows: every company when viewing "All Locations",
  // or only the companies assigned to the selected location — this is the
  // existing GET /api/admin/locations/{id}/customer-companies contract.
  const visibleCompanies = isAllLocations ? companies : (assignedQuery.data || []);
  const visibleCount = isAllLocations ? companies.length : assignedIds.size;

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "customer-companies"] });
    queryClient.invalidateQueries({ queryKey: ["admin", "locations", selectedLocationId, "customer-companies"] });
  };

  // ROOT CAUSE FIX: creating a company previously never assigned it to the
  // selected location — the form only called the create endpoint. Now, when
  // a specific location is selected, we chain the existing create + assign
  // calls so "Add Customer Company" does what the UI promises.
  const createMutation = useMutation({
    mutationFn: async () => {
      const trimmed = name.trim();
      const created = await createManagementResource("/api/admin/customer-companies", { name: trimmed, active: true });
      if (!isAllLocations && selectedLocationId) {
        await assignCustomerCompany(selectedLocationId, created.id);
      }
      return created;
    },
    onSuccess: () => {
      setName("");
      toast.success(isAllLocations ? "Customer Company added." : `Customer Company added to ${selectedLocation?.name || "location"}.`);
      refresh();
    },
    onError: (error) => toast.error(error?.response?.data?.message || error.message || "Unable to add Customer Company."),
  });
  const companyMutation = useMutation({
    mutationFn: ({ company, name, active }) => updateCustomerCompany(company.id, { name, active }),
    onSuccess: refresh,
    onError: (error) => toast.error(error?.response?.data?.message || error.message || "Unable to update Customer Company."),
  });
  const mappingMutation = useMutation({
    mutationFn: ({ companyId, assigned }) => assigned
      ? removeCustomerCompany(selectedLocationId, companyId)
      : assignCustomerCompany(selectedLocationId, companyId),
    onSuccess: () => { toast.success("Assignment updated."); refresh(); },
    onError: (error) => toast.error(error?.response?.data?.message || error.message || "Unable to update the location assignment."),
  });

  const nameInputRef = useRef(null);
  const nameError = name.trim().length > 0 && (name.trim().length < COMPANY_NAME_MIN || name.trim().length > COMPANY_NAME_MAX)
    ? `Company name must be ${COMPANY_NAME_MIN}-${COMPANY_NAME_MAX} characters.`
    : null;
  const canSubmit = name.trim().length >= COMPANY_NAME_MIN && name.trim().length <= COMPANY_NAME_MAX && !isAllLocations && !createMutation.isPending;

  const handleSubmit = (event) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < COMPANY_NAME_MIN || trimmed.length > COMPANY_NAME_MAX) {
      toast.error(`Company name must be ${COMPANY_NAME_MIN}-${COMPANY_NAME_MAX} characters.`);
      return;
    }
    if (isAllLocations) {
      toast.error("Select a location before adding a company.");
      return;
    }
    createMutation.mutate();
  };

  return <Shell title="Customer Companies" description="Manage companies and assign them to operating locations.">
    <CompanyLocationSelector locations={locations} value={selectedLocationId} onChange={setSelectedLocationId} />

    <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border border-[#E7DED2] bg-[#FFFDFC] p-3.5">
      <p className="text-sm font-semibold text-[#29231E]">Add Customer Company</p>
      <Input
        ref={nameInputRef}
        className="h-11 rounded-[10px] border-[#E7DED2]"
        placeholder="Company name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        maxLength={COMPANY_NAME_MAX}
        aria-invalid={!!nameError}
      />
      {nameError && <p className="text-xs text-[#E51B23]">{nameError}</p>}
      {isAllLocations && <p className="text-xs text-[#756E66]">Select a location above to add a company to it.</p>}
      <Button type="submit" disabled={!canSubmit} className="h-11 w-full rounded-[10px] bg-[#E51B23] text-sm font-semibold text-white hover:bg-[#E51B23]/90">
        {createMutation.isPending ? "Adding…" : "Add Customer Company"}
      </Button>
    </form>

    <div>
      <div className="mb-2 flex items-center gap-2">
        <h3 className="text-sm font-semibold text-[#29231E]">Customer Companies</h3>
        <span className="rounded-full bg-[#FFF0F0] px-2 py-0.5 text-[13px] font-semibold text-[#E51B23]">{visibleCount}</span>
      </div>
      <div className="rounded-2xl border border-[#E7DED2] bg-[#FFFDFC]">
        {(companiesLoading || locationsLoading || (!isAllLocations && assignedQuery.isLoading)) && <p className="p-4 text-center text-sm text-[#756E66]">Loading…</p>}
        {!companiesLoading && !visibleCompanies.length && (
          <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
            <p className="text-sm font-semibold text-[#29231E]">No customer companies</p>
            <p className="text-xs text-[#756E66]">{isAllLocations ? "No Customer Companies have been created yet." : `No companies are assigned to ${selectedLocation?.name || "this location"} yet.`}</p>
            {!isAllLocations && <Button type="button" size="sm" className="h-9 rounded-[10px] bg-[#E51B23] text-white hover:bg-[#E51B23]/90" onClick={() => nameInputRef.current?.focus()}>Add Customer Company</Button>}
          </div>
        )}
        {visibleCompanies.map((company) => (
          editingId === company.id ? (
            <div key={company.id} className="flex items-center gap-2 border-b border-[#E7DED2] p-3 last:border-0">
              <Input className="h-10 flex-1 rounded-[10px]" value={editingName} onChange={(event) => setEditingName(event.target.value)} aria-label={`Edit ${company.name}`} maxLength={COMPANY_NAME_MAX} />
              <Button size="sm" className="h-10" disabled={companyMutation.isPending || editingName.trim().length < COMPANY_NAME_MIN} onClick={() => { companyMutation.mutate({ company, name: editingName.trim(), active: company.active }); setEditingId(null); }}>Save</Button>
              <Button size="sm" variant="outline" className="h-10" onClick={() => setEditingId(null)}>Cancel</Button>
            </div>
          ) : (
            <CompanyRow
              key={company.id}
              company={company}
              subtitle={isAllLocations ? (company.active ? "Active" : "Inactive") : (selectedLocation?.name || "Assigned")}
              busy={companyMutation.isPending || mappingMutation.isPending}
              onEdit={() => { setEditingId(company.id); setEditingName(company.name); }}
              onToggleActive={() => companyMutation.mutate({ company, name: company.name, active: !company.active })}
              onRemove={!isAllLocations ? () => mappingMutation.mutate({ companyId: company.id, assigned: true }) : undefined}
            />
          )
        ))}
      </div>
      <ErrorState error={companiesError || locationsError || assignedQuery.error} />
    </div>
  </Shell>;
}

export function ControlCenterAccess() {
  const { data: users = [], isLoading: usersLoading, error: usersError } = useQuery(adminUsersOptions());
  const { data: locations = [], isLoading: locationsLoading, error: locationsError } = useQuery(adminLocationsOptions());
  const [selectedId, setSelectedId] = useState(null);
  const selectedUser = users.find((item) => String(item.id) === String(selectedId)) || users[0];
  const assignedQuery = useQuery(userLocationsOptions(selectedUser?.id));
  const [role, setRole] = useState(ROLE.CUSTOMER);
  const [selectedLocations, setSelectedLocations] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!selectedUser) return;
    const timer = window.setTimeout(() => {
      setSelectedId(selectedUser.id);
      setRole(selectedUser.role || ROLE.CUSTOMER);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [selectedUser]);
  useEffect(() => {
    const timer = window.setTimeout(() => setSelectedLocations((assignedQuery.data || []).map((item) => String(item.id))), 0);
    return () => window.clearTimeout(timer);
  }, [assignedQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const before = new Set((assignedQuery.data || []).map((item) => String(item.id)));
      const after = new Set(selectedLocations);
      await updateUserRole(selectedUser.id, { role });
      await Promise.all([
        [...after].filter((id) => !before.has(id)).map((id) => grantUserLocation(selectedUser.id, id)),
        [...before].filter((id) => !after.has(id)).map((id) => revokeUserLocation(selectedUser.id, id)),
      ].flat());
    },
    onSuccess: async () => {
      setFeedback({ type: "success", text: "Access saved." });
      await queryClient.invalidateQueries({ queryKey: ["admin", "users", selectedUser.id, "locations"] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (error) => setFeedback({ type: "error", text: error.message || "Unable to save access." }),
  });
  const loading = usersLoading || locationsLoading;
  const canSave = Boolean(selectedUser) && !saveMutation.isPending && !assignedQuery.isLoading;
  const toggleLocation = (id) => setSelectedLocations((current) => current.includes(String(id)) ? current.filter((value) => value !== String(id)) : [...current, String(id)]);

  return <Shell title="Access Management" description="Manage each user's role and authorized operating locations.">
    <div className="grid gap-4 lg:grid-cols-[minmax(14rem,0.7fr)_minmax(0,1.3fr)]">
      <Card><CardHeader><CardTitle>Users</CardTitle></CardHeader><CardContent className="space-y-2">
        {users.map((item) => <button type="button" key={item.id} onClick={() => setSelectedId(item.id)} className={`flex min-h-14 w-full items-center justify-between rounded-xl border px-3 text-left ${String(item.id) === String(selectedUser?.id) ? "border-primary bg-primary/5" : "border-zinc-200"}`}><span className="min-w-0 truncate text-sm font-semibold">{item.email || item.name || item.username}</span><span className="ml-2 text-[10px] font-bold uppercase text-zinc-500">{item.role || ROLE.CUSTOMER}</span></button>)}
        {!users.length && !usersLoading && <p className="py-6 text-sm text-zinc-500">No users found.</p>}
      </CardContent></Card>
      <Card><CardHeader><CardTitle>{selectedUser ? "User access" : "Select a user"}</CardTitle></CardHeader><CardContent className="space-y-5">
        {loading && <p className="text-sm text-zinc-500">Loading access…</p>}
        {selectedUser && !loading && <><div><p className="text-sm font-semibold">{selectedUser.email || selectedUser.name || selectedUser.username}</p><label className="mt-3 block text-xs font-bold uppercase tracking-wide text-zinc-500" htmlFor="user-role">Role</label><select id="user-role" className="mt-1 min-h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm" value={role} onChange={(event) => setRole(event.target.value)}>{Object.values(ROLE).map((value) => <option key={value}>{value}</option>)}</select></div>
          <fieldset><legend className="text-xs font-bold uppercase tracking-wide text-zinc-500">Locations</legend><div className="mt-2 space-y-2">{locations.map((location) => <label key={location.id} className="flex min-h-11 items-center gap-3 rounded-lg border border-zinc-200 px-3"><input type="checkbox" className="size-4" checked={selectedLocations.includes(String(location.id))} onChange={() => toggleLocation(location.id)} /><span className="text-sm">{location.name || location.title || `Location ${location.id}`}</span></label>)}</div></fieldset>
          <Button className="min-h-11 w-full" disabled={!canSave} onClick={() => { setFeedback(null); saveMutation.mutate(); }}>{saveMutation.isPending ? "Saving…" : <><Check className="size-4" /> Save Access</>}</Button>
          {feedback && <p role="status" className={feedback.type === "error" ? "text-sm text-red-700" : "text-sm text-emerald-700"}>{feedback.text}</p>}
        </>}
        <ErrorState error={usersError || locationsError || assignedQuery.error} />
      </CardContent></Card>
    </div>
  </Shell>;
}

// A single reusable row for one payment method's status/control — mirrors the
// existing ToggleRow pattern used on /admin/global-controls (Settings).
function PaymentMethodRow({ icon, title, description, enabled, onToggle, readOnly, loading }) {
  const Icon = icon;
  return (
    <div className="flex h-14 items-center gap-3 px-3">
      <div className={`grid size-9 shrink-0 place-items-center rounded-xl ${enabled ? "bg-emerald-50 text-emerald-600" : "bg-zinc-100 text-zinc-400"}`}>
        <Icon className="size-[18px]" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[#29231E]">{title}</p>
        <p className="truncate text-[11px] text-[#756E66]">{description}</p>
      </div>
      {readOnly
        ? <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold uppercase ${enabled ? "bg-emerald-50 text-emerald-600" : "bg-zinc-100 text-zinc-500"}`}>{enabled ? "Enabled" : "Disabled"}</span>
        : <Switch checked={!!enabled} onCheckedChange={onToggle} disabled={loading || enabled === null || enabled === undefined} aria-label={`Toggle ${title}`} />}
    </div>
  );
}

// Payments tab — reuses the existing payment settings API/state 1:1
// (adminSettingsOptions + adminSetPayAtStall + paymentConfigOptions, the same
// hooks that power /admin/global-controls). No new payment API is introduced.
export function ControlCenterPayments() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading: settingsLoading } = useQuery(adminSettingsOptions);
  const { data: paymentConfig, isLoading: configLoading } = useQuery(paymentConfigOptions);
  const payAtStall = settings?.payAtStallEnabled ?? false;

  const toggleMutation = useMutation({
    mutationFn: (enabled) => adminSetPayAtStall(enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminSettingsOptions.queryKey });
      queryClient.invalidateQueries({ queryKey: paymentConfigOptions.queryKey });
    },
  });

  return <Shell title="Payment Management" description="Configure which payment methods customers can use.">
    <Card className="border-[#E7DED2] bg-[#FFFDFC] shadow-none">
      <CardHeader><CardTitle className="text-sm font-semibold text-[#29231E]">Payment methods</CardTitle></CardHeader>
      <CardContent className="divide-y divide-[#E7DED2] p-0">
        <PaymentMethodRow
          icon={Wallet}
          title="Valid Balance (Wallet)"
          description="Customer wallet balance payments"
          enabled={configLoading ? null : paymentConfig?.walletEnabled}
          readOnly
        />
        <PaymentMethodRow
          icon={IndianRupee}
          title="Razorpay"
          description="Card, UPI & netbanking via Razorpay"
          enabled={configLoading ? null : paymentConfig?.razorpayEnabled}
          readOnly
        />
        <PaymentMethodRow
          icon={MapPin}
          title="Pay at Stall"
          description="Order now, settle the bill at the counter"
          enabled={settingsLoading ? null : payAtStall}
          loading={toggleMutation.isPending}
          onToggle={() => toggleMutation.mutate(!payAtStall)}
        />
      </CardContent>
    </Card>
    <ErrorState error={toggleMutation.error} />
  </Shell>;
}
