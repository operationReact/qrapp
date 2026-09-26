import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "@tanstack/react-router";
import { toast } from "sonner";
import { Bell, Building2, CalendarDays, Check, ChevronDown, CreditCard, Eye, EyeOff, Globe2, Heart, IndianRupee, KeyRound, MapPin, Menu, MoreHorizontal, MoreVertical, Plus, Search, ShieldCheck, Store, UserRound, Users, UsersRound, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useSidebar } from "@/components/ui/sidebar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAdminDashboard } from "@/context/AdminDashboardContext";
import { useLocation as useActiveLocation } from "@/context/LocationContext";
import { hasRole, ROLE } from "@/lib/roles";
import { useAuth } from "@/context/AuthContext";
import { INDIA_STATES_AND_UTS, locationCodePreview } from "@/lib/indiaStates";
import { adminSettingsOptions, paymentConfigOptions } from "@/query/options/orders";
import { adminSetPayAtStall } from "@/services/order-service";
import { partyOrdersOptions } from "@/query/options/party-orders";
import { adminHallOfHappinessOptions } from "@/query/options/admin-hall-of-happiness";
import { adminCreateUserOptions, adminCustomerCompaniesOptions, adminLocationsOptions, adminUsersOptions, adminVendorsOptions, assignCustomerCompany, createAdminLocation, createAdminUser, createManagementResource, grantUserLocation, locationCustomerCompaniesOptions, removeCustomerCompany, revokeUserLocation, updateAdminLocation, updateCustomerCompany, updateUserRole, userLocationsOptions } from "@/query/options/management";

const primaryNavigation = [
  { to: "/admin/control-center", label: "Overview", roles: [ROLE.SUPER_ADMIN] },
  { to: "/admin/control-center/users", label: "Users", roles: [ROLE.SUPER_ADMIN] },
  { to: "/admin/control-center/locations", label: "Locations", roles: [ROLE.SUPER_ADMIN] },
];

const moreNavigation = [
  { to: "/admin/control-center/customer-companies", label: "Customer Companies", roles: [ROLE.SUPER_ADMIN] },
  { to: "/admin/vendors", label: "Vendors", roles: [ROLE.SUPER_ADMIN, ROLE.ADMIN, ROLE.MANAGER] },
  { to: "/admin/control-center/access", label: "Access Management", roles: [ROLE.SUPER_ADMIN] },
  { to: "/admin/control-center/payments", label: "Payment Management", roles: [ROLE.SUPER_ADMIN] },
  { to: "/admin/hall-of-happiness", label: "Hall of Happiness", roles: [ROLE.SUPER_ADMIN, ROLE.ADMIN, ROLE.MANAGER] },
  { to: "/admin/party-orders", label: "Party Orders", roles: [ROLE.SUPER_ADMIN, ROLE.ADMIN, ROLE.MANAGER] },
];

// Compact 64px header: hamburger (opens the same admin sidebar), page title,
// and a bell reusing the exact notification-count logic already used by the
// generic admin sub-page header (delayed + placed orders).
function ControlCenterHeader() {
  const { toggleSidebar } = useSidebar();
  const { dashboard } = useAdminDashboard();
  const notifCount = Math.min((dashboard?.delayedOrders ?? 0) + (dashboard?.placedOrders ?? 0), 9);
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--cc-divider)] bg-white">
      <div className="mx-auto flex h-14 max-w-[1280px] items-center justify-between px-4 md:h-16 md:px-6">
        <button type="button" onClick={toggleSidebar} aria-label="Open menu" className="grid size-11 shrink-0 place-items-center rounded-[10px] text-[var(--cc-text)] transition-colors hover:bg-[var(--cc-primary-light)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cc-primary)]/30">
          <Menu className="size-5" strokeWidth={1.9} aria-hidden="true" />
        </button>
        <h1 className="min-w-0 truncate text-[18px] font-semibold leading-6 text-[var(--cc-text)]">Control Center</h1>
        <button type="button" aria-label="Notifications" className="relative grid size-11 shrink-0 place-items-center rounded-[10px] text-[var(--cc-text)] transition-colors hover:bg-[var(--cc-primary-light)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cc-primary)]/30">
          <Bell className="size-5" strokeWidth={1.9} aria-hidden="true" />
          {notifCount > 0 && <span className="absolute top-1.5 right-1.5 flex size-4 items-center justify-center rounded-full bg-[var(--cc-primary)] text-[9px] font-bold leading-none text-white">{notifCount > 9 ? "9+" : notifCount}</span>}
        </button>
      </div>
    </header>
  );
}

function ControlCenterNavigation() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef(null);
  const visiblePrimary = primaryNavigation.filter((item) => hasRole(user, item.roles));
  const visibleMore = moreNavigation.filter((item) => hasRole(user, item.roles));
  const moreActive = visibleMore.some((item) => pathname === item.to || pathname.startsWith(`${item.to}/`));

  useEffect(() => {
    if (!moreOpen) return undefined;
    const closeOnPointerDown = (event) => {
      if (!moreRef.current?.contains(event.target)) setMoreOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setMoreOpen(false);
    };
    document.addEventListener("pointerdown", closeOnPointerDown);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnPointerDown);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [moreOpen]);

  return (
    <nav aria-label="Control Center navigation" className="relative z-30 mx-auto max-w-[1200px] px-4 py-3 md:px-6">
      <div className="flex h-[42px] items-center gap-1 rounded-full border border-[var(--cc-border)] bg-white p-1">
        {visiblePrimary.map(({ to, label }) => {
          const active = pathname === to;
          return <Link key={to} to={to} className={`flex min-w-0 flex-1 items-center justify-center rounded-full px-2 text-xs font-semibold transition-colors sm:px-3 sm:text-[13px] ${active ? "bg-[#24211F] text-white" : "text-[#24211F] hover:bg-[var(--cc-primary-light)]"}`}>{label}</Link>;
        })}
        {visibleMore.length > 0 && (
          <div ref={moreRef} className="relative min-w-0 flex-1">
            <button type="button" aria-haspopup="menu" aria-expanded={moreOpen} onClick={() => setMoreOpen((current) => !current)} className={`flex h-10 w-full items-center justify-center gap-1 rounded-full px-2 text-xs font-semibold transition-colors sm:px-3 sm:text-[13px] ${moreActive || moreOpen ? "bg-[#24211F] text-white" : "text-[#24211F] hover:bg-[var(--cc-primary-light)]"}`}>
              <span>More</span>
              <MoreHorizontal className="size-4" strokeWidth={2} aria-hidden="true" />
            </button>
            {moreOpen && <div role="menu" className="absolute right-0 top-[calc(100%+8px)] w-[min(232px,calc(100vw-32px))] rounded-[16px] border border-[var(--cc-border)] bg-white p-1.5 shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
              {visibleMore.map(({ to, label }) => <Link key={to} to={to} role="menuitem" onClick={() => setMoreOpen(false)} className={`flex min-h-10 items-center rounded-[10px] px-3 text-sm ${pathname === to || pathname.startsWith(`${to}/`) ? "bg-[var(--cc-primary-light)] font-semibold text-[var(--cc-primary-dark)]" : "text-[var(--cc-text)] hover:bg-[var(--cc-page)]"}`}>{label}</Link>)}
            </div>}
          </div>
        )}
      </div>
    </nav>
  );
}

function ControlCenterLocationContext() {
  const queryClient = useQueryClient();
  const {
    activeLocation,
    availableLocations,
    allLocationsOption,
    canSelectAllLocations,
    setActiveLocation,
    isLoading,
  } = useActiveLocation();
  const activeId = String(activeLocation?.id || "");
  return <div className="mx-auto max-w-[1280px] px-4 pt-2 md:px-6">
    <label className="relative block max-w-xs">
      <span className="sr-only">Active location</span>
      <MapPin className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-[var(--cc-primary)]" aria-hidden="true" />
      <select
        aria-label="Active location"
        value={activeId}
        disabled={isLoading}
        onChange={(event) => {
          const next = event.target.value === String(allLocationsOption?.id)
            ? allLocationsOption
            : availableLocations.find((location) => String(location.id) === event.target.value);
          if (next) {
            setActiveLocation(next);
            queryClient.invalidateQueries({ queryKey: ["admin"] });
            queryClient.invalidateQueries({ queryKey: ["party-orders"] });
            queryClient.invalidateQueries({ queryKey: ["admin-users"] });
            queryClient.invalidateQueries({ queryKey: ["admin-locations"] });
            queryClient.invalidateQueries({ queryKey: ["admin-customer-companies"] });
          }
        }}
        className="h-10 w-full appearance-none rounded-[10px] border border-[var(--cc-border)] bg-white px-10 pr-8 text-[13px] font-semibold text-[var(--cc-text)] outline-none transition focus-visible:border-[var(--cc-primary)] focus-visible:ring-2 focus-visible:ring-[var(--cc-primary)]/20 disabled:opacity-60"
      >
        {canSelectAllLocations && <option value={String(allLocationsOption?.id)}>All Locations</option>}
        {availableLocations.map((location) => <option key={location.id} value={String(location.id)}>{location.name || location.title || `Location ${location.id}`}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[var(--cc-muted-text)]" aria-hidden="true" />
    </label>
  </div>;
}

function Shell({ title, description, children, showLocationContext = true }) {
  return (
    <main className="admin-control-center min-h-screen w-full bg-[var(--cc-page)] pb-10 text-[var(--cc-text)]">
      <ControlCenterHeader />
      {showLocationContext && <ControlCenterLocationContext />}
      <ControlCenterNavigation />
      <div className="mx-auto max-w-[1200px] space-y-5 px-4 md:px-6">
        {title && (
          <div>
            <h2 className="text-[22px] font-bold leading-7 text-[var(--cc-text)]">{title}</h2>
            {description && <p className="mt-1 text-[13px] leading-[18px] text-[var(--cc-secondary-text)]">{description}</p>}
          </div>
        )}
        {children}
      </div>
    </main>
  );
}

function ErrorState({ error }) { return error ? <p className="rounded-[10px] border border-[var(--cc-error)]/20 bg-[var(--cc-error-bg)] p-4 text-sm text-[var(--cc-error)]">Unable to load this data. {error.message}</p> : null; }
function ManagementCard({ to, icon, title, count, description }) {
  const Icon = icon;
  const isStatus = typeof count === "string";
  return (
    <Link to={to} className="flex h-[clamp(96px,28vw,108px)] min-h-[96px] max-h-[108px] items-start gap-2.5 rounded-[14px] border border-[var(--cc-border)] bg-[var(--cc-card)] p-3 shadow-[0_1px_3px_rgba(0,0,0,0.05)] transition duration-150 hover:-translate-y-px hover:border-[var(--cc-primary)]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cc-primary)]/30">
      <div className="grid size-8 shrink-0 place-items-center rounded-[10px] bg-[var(--cc-primary-light)] text-[var(--cc-primary)]">
        <Icon className="size-4" strokeWidth={1.9} aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="min-w-0 truncate text-[13px] font-semibold leading-[18px] text-[var(--cc-text)]">{title}</p>
          <p className={isStatus ? "shrink-0 rounded-full bg-[var(--cc-primary-light)] px-2 py-1 text-[10px] font-semibold leading-3 text-[var(--cc-primary-dark)]" : "shrink-0 text-xl font-bold leading-6 text-[var(--cc-text)]"}>{count ?? 0}</p>
        </div>
        <p className="mt-1 line-clamp-2 text-[10px] leading-[14px] text-[var(--cc-muted-text)]">{description} <span aria-hidden="true">→</span></p>
      </div>
    </Link>
  );
}

export function ControlCenterOverview() {
  const { data: users = [] } = useQuery(adminUsersOptions());
  const { data: locations = [] } = useQuery(adminLocationsOptions());
  const { data: companies = [] } = useQuery(adminCustomerCompaniesOptions());
  const { data: vendors = [] } = useQuery(adminVendorsOptions());
  const { data: partyOrders = [] } = useQuery(partyOrdersOptions);
  const { data: hallData } = useQuery(adminHallOfHappinessOptions({ page: 0, size: 100 }));
  const { data: paymentConfig } = useQuery(paymentConfigOptions);
  const hallPhotos = hallData?.content || [];
  const pendingHall = hallPhotos.filter((photo) => ["CUSTOMER_UPLOAD", "PENDING", "PENDING_REVIEW"].includes(photo.status)).length;
  const enabledPayments = [paymentConfig?.walletEnabled, paymentConfig?.razorpayEnabled, paymentConfig?.payAtStallEnabled].filter(Boolean).length;

  const groups = [
    {
      label: "Organization",
      cards: [
        { to: "/admin/control-center/users", title: "Users", count: users.length, icon: Users, description: "Manage internal accounts and access" },
        { to: "/admin/control-center/locations", title: "Locations", count: locations.length, icon: Building2, description: "Configure operating locations" },
        { to: "/admin/control-center/customer-companies", title: "Customer Companies", count: companies.length, icon: UsersRound, description: "Manage company assignments" },
        { to: "/admin/vendors", title: "Vendors", count: vendors.length, icon: Store, description: "Manage vendors and costs" },
      ],
    },
    {
      label: "Security & Configuration",
      cards: [
        { to: "/admin/control-center/access", title: "Access Management", count: "Configured", icon: KeyRound, description: "Manage roles" },
        { to: "/admin/control-center/payments", title: "Payment Management", count: enabledPayments, icon: CreditCard, description: "Configure payment methods" },
      ],
    },
    {
      label: "Operations",
      cards: [
        { to: "/admin/party-orders", title: "Party Orders", count: partyOrders.filter((order) => !["COMPLETED", "CANCELLED"].includes(order.status)).length, icon: CalendarDays, description: "Review Party/Event orders" },
        { to: "/admin/hall-of-happiness", title: "Hall of Happiness", count: pendingHall, icon: Heart, description: pendingHall ? "Pending review" : "No pending reviews" },
      ],
    },
  ];

  return <Shell title="Control Center" description="Manage your Bro & Bro operations." showLocationContext={false}>
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.label} className="space-y-2.5" aria-labelledby={`control-center-${group.label}`}>
            <h3 id={`control-center-${group.label}`} className="text-[10px] font-bold leading-[14px] uppercase tracking-[0.08em] text-[var(--cc-muted-text)]">{group.label}</h3>
            <div className={`grid grid-cols-2 gap-2.5 ${group.label === "Organization" ? "lg:grid-cols-4" : "lg:grid-cols-2 xl:grid-cols-4"}`}>
            {group.cards.map((card) => <ManagementCard key={card.to} {...card} />)}
          </div>
        </section>
      ))}
    </div>
  </Shell>;
}

const roleLabels = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  CUSTOMER: "Customer",
  MANAGER: "Manager",
  KITCHEN_STAFF: "Kitchen Staff",
};
const defaultAssignableRoles = [ROLE.ADMIN, ROLE.MANAGER, ROLE.KITCHEN_STAFF];

function humanRole(role) {
  return roleLabels[String(role || "").replace(/^ROLE_/, "")] || String(role || "Unknown").replaceAll("_", " ");
}

function Field({ label, icon: Icon, children, hint }) {
  return <label className="block space-y-1.5">
    <span className="flex items-center gap-1 text-xs font-semibold text-[var(--cc-text)]">{label}</span>
    <div className="relative">
      {Icon && <Icon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--cc-muted-text)]" aria-hidden="true" />}
      {children}
    </div>
    {hint && <span className="text-xs text-[var(--cc-muted-text)]">{hint}</span>}
  </label>;
}

function UserCreateDialog({ open, onOpenChange, form, setForm, roles, locations, optionsLoading, mutation, apiError, optionsError }) {
  const [showPassword, setShowPassword] = useState(false);
  const canSubmit = form.name.trim() && /^(?:\+91[\s-]?)?[6-9]\d{9}$/.test(form.phone.trim()) && form.password && form.role && form.locationId && !mutation.isPending;
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[calc(100vh-32px)] overflow-y-auto rounded-[20px] border border-[var(--cc-border)] bg-white p-5 shadow-[0_12px_40px_rgba(0,0,0,0.16)] sm:max-w-lg">
      <DialogHeader>
        <DialogTitle className="text-lg font-semibold text-[var(--cc-text)]">Create User</DialogTitle>
        <DialogDescription className="text-sm text-[var(--cc-secondary-text)]">Create an internal user who can sign in immediately.</DialogDescription>
      </DialogHeader>
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); if (canSubmit) mutation.mutate(); }}>
        <Field label="Full Name" icon={UserRound}><Input className="h-11 rounded-[10px] border-[var(--cc-border)] pl-10 focus-visible:border-[var(--cc-primary)] focus-visible:ring-2 focus-visible:ring-[var(--cc-primary)]" required placeholder="Full name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></Field>
        <Field label="WhatsApp / Phone Number" icon={MapPin}><Input className="h-11 rounded-[10px] border-[var(--cc-border)] pl-10 focus-visible:border-[var(--cc-primary)] focus-visible:ring-2 focus-visible:ring-[var(--cc-primary)]" required inputMode="tel" placeholder="WhatsApp number" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} /></Field>
        <Field label="Password" icon={KeyRound}><Input className="h-11 rounded-[10px] border-[var(--cc-border)] px-10 focus-visible:border-[var(--cc-primary)] focus-visible:ring-2 focus-visible:ring-[var(--cc-primary)]" required type={showPassword ? "text" : "password"} placeholder="Secure password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} /><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((current) => !current)} className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-[8px] text-[var(--cc-muted-text)] hover:bg-[var(--cc-primary-light)]">{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></Field>
        <Field label="Role" icon={ShieldCheck}><select required className="h-11 w-full appearance-none rounded-[10px] border border-[var(--cc-border)] bg-white px-10 text-sm focus:border-[var(--cc-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--cc-primary)]" value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))} disabled={optionsLoading}><option value="">Select role</option>{roles.map((role) => <option key={role} value={role}>{humanRole(role)}</option>)}</select></Field>
        <Field label="Location" icon={MapPin}><select required className="h-11 w-full appearance-none rounded-[10px] border border-[var(--cc-border)] bg-white px-10 text-sm focus:border-[var(--cc-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--cc-primary)] sm:col-span-2" value={form.locationId} onChange={(event) => setForm((current) => ({ ...current, locationId: event.target.value }))} disabled={optionsLoading}><option value="">Select active location</option>{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></Field>
        <Button type="submit" className="h-11 rounded-[10px] bg-[var(--cc-primary)] text-sm font-semibold text-white hover:bg-[var(--cc-primary-dark)] disabled:bg-[#F9A0A8] sm:col-span-2" disabled={!canSubmit}>{mutation.isPending ? "Creating user..." : "Create User"}</Button>
      </form>
      {apiError && <p className="rounded-[10px] border border-[var(--cc-error)]/20 bg-[var(--cc-error-bg)] p-3 text-sm text-[var(--cc-error)]">{apiError}</p>}
      {optionsError && <ErrorState error={optionsError} />}
    </DialogContent>
  </Dialog>;
}

function UserCard({ user }) {
  const active = user.active ?? user.enabled ?? true;
  return <div className="flex min-h-[76px] items-center gap-3 rounded-[16px] border border-[var(--cc-border)] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
    <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--cc-primary-light)] text-[var(--cc-primary)]"><UserRound className="size-5" /></div>
    <div className="min-w-0 flex-1"><p className="truncate text-[15px] font-semibold text-[var(--cc-text)]">{user.name || user.fullName || user.username || "Unnamed user"}</p><p className="truncate text-xs text-[var(--cc-secondary-text)]">{user.phone || user.whatsappNumber || user.email || "No phone number"}</p></div>
    <div className="hidden items-end gap-1.5 sm:flex sm:flex-col"><span className="rounded-full bg-[var(--cc-primary-light)] px-2.5 py-1 text-xs font-semibold text-[var(--cc-primary-dark)]">{humanRole(user.role || user.roles?.[0])}</span><span className={`text-xs ${active ? "text-[var(--cc-success)]" : "text-[var(--cc-muted-text)]"}`}>{active ? "Active" : "Inactive"}</span></div>
    <DropdownMenu><DropdownMenuTrigger className="grid size-11 shrink-0 place-items-center rounded-[10px] text-[var(--cc-muted-text)] hover:bg-[var(--cc-primary-light)]" aria-label={`Actions for ${user.name || "user"}`}><MoreVertical className="size-5" /></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem>View access</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
  </div>;
}

export function ControlCenterUsers() {
  const { data = [], isLoading, error } = useQuery(adminUsersOptions());
  const { data: options, isLoading: optionsLoading, error: optionsError } = useQuery(adminCreateUserOptions());
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: "", phone: "", password: "", role: "", locationId: "" });
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const mutation = useMutation({
    mutationFn: () => createAdminUser({ ...form, name: form.name.trim(), phone: form.phone.trim(), locationId: Number(form.locationId) }),
    onSuccess: () => {
      setForm({ name: "", phone: "", password: "", role: "", locationId: "" });
      setCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success("Internal user created successfully.");
    },
  });
  const apiError = mutation.error
    ? mutation.error?.response?.status === 409
      ? "That phone number is already registered."
      : mutation.error?.response?.status === 403
        ? "Only a Super Admin can create users."
        : mutation.error?.response?.data === "invalid_phone_number"
          ? "Enter a valid Indian WhatsApp number."
          : "Unable to create user. Check the details and try again."
    : null;
  const roles = options?.roles || [];
  const locations = options?.locations || [];
  const filteredUsers = data.filter((user) => {
    const query = search.trim().toLowerCase();
    const name = String(user.name || user.fullName || user.username || "").toLowerCase();
    const phone = String(user.phone || user.whatsappNumber || "").toLowerCase();
    const active = user.active ?? user.enabled ?? true;
    return (!query || name.includes(query) || phone.includes(query)) && (roleFilter === "ALL" || String(user.role || user.roles?.[0]) === roleFilter) && (statusFilter === "ALL" || (statusFilter === "ACTIVE" ? active : !active));
  });
  return <Shell title="Users" description="Create and manage internal users.">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="relative w-full sm:max-w-sm"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--cc-muted-text)]" /><Input className="h-11 rounded-[10px] border-[var(--cc-border)] bg-white pl-10" placeholder="Search name or WhatsApp number" value={search} onChange={(event) => setSearch(event.target.value)} /></div><Button className="h-11 w-full rounded-[10px] bg-[var(--cc-primary)] text-sm font-semibold text-white hover:bg-[var(--cc-primary-dark)] sm:w-auto" onClick={() => setCreateOpen(true)}><Plus className="size-[18px]" /> Create User</Button></div>
    <div className="grid grid-cols-2 gap-2 sm:max-w-md"><select className="h-11 rounded-[10px] border border-[var(--cc-border)] bg-white px-3 text-sm" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}><option value="ALL">All Roles</option>{[...new Set(data.map((user) => user.role || user.roles?.[0]).filter(Boolean))].map((role) => <option key={role} value={role}>{humanRole(role)}</option>)}</select><select className="h-11 rounded-[10px] border border-[var(--cc-border)] bg-white px-3 text-sm" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="ALL">All Status</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></div>
    {isLoading ? <p className="text-sm text-[var(--cc-muted-text)]">Loading users...</p> : <div className="grid gap-3 lg:grid-cols-2">{filteredUsers.map((user) => <UserCard key={user.id} user={user} />)}{!filteredUsers.length && <p className="rounded-[16px] border border-[var(--cc-border)] bg-white p-8 text-center text-sm text-[var(--cc-muted-text)] lg:col-span-2">No users match these filters.</p>}</div>}
    <ErrorState error={error} />
    <UserCreateDialog open={createOpen} onOpenChange={setCreateOpen} form={form} setForm={setForm} roles={roles} locations={locations} optionsLoading={optionsLoading} mutation={mutation} apiError={apiError} optionsError={optionsError} />
  </Shell>;
}

function LocationCard({ location, onEdit }) {
  const active = location.active ?? true;
  return <div className="flex items-center gap-3 rounded-[16px] border border-[var(--cc-border)] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
    <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--cc-primary-light)] text-[var(--cc-primary)]"><MapPin className="size-5" /></div>
    <div className="min-w-0 flex-1"><p className="truncate text-base font-semibold text-[var(--cc-text)]">{location.name}</p><p className="truncate text-xs text-[#77716D]">{location.code || location.locationCode || "Generated on save"}</p><p className="mt-1 truncate text-[13px] text-[var(--cc-secondary-text)]">{[location.addressLine1, location.city, location.stateUt, location.pinCode].filter(Boolean).join(", ") || location.address || "No address provided"}</p></div>
    <span className={`hidden rounded-full px-2.5 py-1 text-xs font-semibold sm:inline-flex ${active ? "bg-[var(--cc-success-bg)] text-[var(--cc-success)]" : "bg-[var(--cc-page)] text-[var(--cc-muted-text)]"}`}>{active ? "ACTIVE" : "INACTIVE"}</span>
    <DropdownMenu><DropdownMenuTrigger className="grid size-11 shrink-0 place-items-center rounded-[10px] text-[var(--cc-muted-text)] hover:bg-[var(--cc-primary-light)]" aria-label={`Actions for ${location.name}`}><MoreVertical className="size-5" /></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => onEdit(location)}>Edit location</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
  </div>;
}

function StateSelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const options = INDIA_STATES_AND_UTS.filter((state) => state.toLowerCase().includes(search.toLowerCase()));
  return <div className="relative">
    <button type="button" className="flex h-11 w-full items-center gap-2 rounded-[10px] border border-[var(--cc-border)] bg-white px-3 text-left text-sm" onClick={() => setOpen((current) => !current)} aria-haspopup="listbox" aria-expanded={open}>
      <MapPin className="size-4 shrink-0 text-[var(--cc-primary)]" /><span className={`min-w-0 flex-1 truncate ${value ? "text-[var(--cc-text)]" : "text-[var(--cc-muted-text)]"}`}>{value || "Select State / UT"}</span><ChevronDown className="size-4 text-[var(--cc-muted-text)]" />
    </button>
    {open && <div className="absolute z-50 mt-1 max-h-72 w-full overflow-hidden rounded-[10px] border border-[var(--cc-border)] bg-white shadow-lg">
      <div className="border-b border-[#F0ECE8] p-2"><div className="relative"><Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-[var(--cc-muted-text)]" /><Input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search states and UTs..." className="h-10 rounded-lg pl-9" /></div></div>
      <div className="max-h-56 overflow-y-auto p-1" role="listbox">{options.map((state) => <button type="button" key={state} className="flex min-h-11 w-full items-center rounded-lg px-3 text-left text-sm hover:bg-[var(--cc-primary-light)]" onClick={() => { onChange(state); setOpen(false); setSearch(""); }}>{state}</button>)}{!options.length && <p className="p-3 text-sm text-[var(--cc-muted-text)]">No matching state or UT.</p>}</div>
    </div>}
  </div>;
}

function LocationDialog({ open, onOpenChange, initial, onSave, pending, error }) {
  const [form, setForm] = useState(() => ({ code: initial?.code || "", name: initial?.name || "", country: "India", addressLine1: initial?.addressLine1 || initial?.address || "", addressLine2: initial?.addressLine2 || "", landmark: initial?.landmark || "", city: initial?.city || "", district: initial?.district || "", stateUt: initial?.stateUt || "", pinCode: initial?.pinCode || "", active: initial?.active ?? true }));
  const [locationCodeManuallyEdited, setLocationCodeManuallyEdited] = useState(Boolean(initial?.codeManuallyEdited ?? initial?.code));
  const [photo, setPhoto] = useState(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const editing = Boolean(initial);
  const photoPreview = useMemo(() => photo ? URL.createObjectURL(photo) : "", [photo]);
  useEffect(() => photoPreview ? () => URL.revokeObjectURL(photoPreview) : undefined, [photoPreview]);
  const selectPhoto = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setPhotoError("Choose a JPG, JPEG, PNG or WEBP image up to 5 MB.");
      return;
    }
    setPhotoError("");
    setPhoto(file);
    setRemovePhoto(false);
  };
  const existingSequence = initial?.codeSequence || Number(initial?.code?.match(/-(\d+)$/)?.[1]) || 1;
  const previewCode = form.code;
  const update = (key) => (event) => {
    const value = event.target.value;
    if (key === "name" && !locationCodeManuallyEdited) {
      setForm((current) => ({ ...current, name: value, code: locationCodePreview(value, current.stateUt, editing ? existingSequence : 1) }));
      return;
    }
    setForm((current) => ({ ...current, [key]: value }));
  };
  const updateState = (stateUt) => {
    setForm((current) => ({ ...current, stateUt, code: locationCodeManuallyEdited ? current.code : locationCodePreview(current.name, stateUt, editing ? existingSequence : 1) }));
  };
  const updateLocationCode = (event) => {
    setLocationCodeManuallyEdited(true);
    setForm((current) => ({ ...current, code: event.target.value }));
  };
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90vh] overflow-y-auto rounded-[20px] border border-[var(--cc-border)] bg-white p-5 shadow-[0_12px_40px_rgba(0,0,0,0.16)] sm:max-w-2xl"><DialogHeader><DialogTitle className="text-lg font-semibold">{editing ? "Edit Location" : "Add Location"}</DialogTitle><DialogDescription className="text-sm text-[var(--cc-secondary-text)]">{editing ? "Update the structured operating location details." : "Create an India-based operating location."}</DialogDescription></DialogHeader><form className="grid gap-4 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); onSave({ ...form, code: locationCodeManuallyEdited ? form.code : "", photo, removePhoto }); }}>
    <Field label="Location Name" icon={MapPin}><Input required className="h-11 rounded-[10px] pl-10" value={form.name} onChange={update("name")} /></Field>
    <div className="space-y-1.5 sm:col-span-2"><span className="flex items-center gap-1 text-xs font-semibold text-[var(--cc-text)]">Location Photo <span className="font-normal text-[var(--cc-muted-text)]">(optional)</span></span><div className="overflow-hidden rounded-[12px] border border-dashed border-[var(--cc-border)] bg-[#FAF8F5] p-3">{photo || (initial?.locationPhotoUrl && !removePhoto) ? <div className="flex items-center gap-3"><img src={photoPreview || initial.locationPhotoUrl} alt={`${form.name || "Location"} preview`} className="h-20 w-32 rounded-lg object-cover" /><div className="flex flex-wrap gap-2"><label className="inline-flex h-10 cursor-pointer items-center rounded-lg border border-[var(--cc-border)] bg-white px-3 text-sm font-medium">Change Photo<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={selectPhoto} /></label><button type="button" className="h-10 rounded-lg border border-[var(--cc-border)] bg-white px-3 text-sm font-medium" onClick={() => { setPhoto(null); setPhotoError(""); setRemovePhoto(true); }}>Remove Photo</button></div></div> : <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-1 text-sm text-[var(--cc-muted-text)]"><span className="font-medium text-[var(--cc-text)]">Upload Photo</span><span>JPG, JPEG, PNG or WEBP · max 5 MB · recommended 16:9</span><input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={selectPhoto} /></label>}{photoError && <p className="mt-2 text-xs text-[var(--cc-error)]">{photoError}</p>}</div></div>
    <Field label="Country"><Input readOnly className="h-11 rounded-[10px] bg-[#FAF8F5]" value="India" /></Field>
    <Field label="Address Line 1" icon={Building2}><Input required className="h-11 rounded-[10px] pl-10" value={form.addressLine1} onChange={update("addressLine1")} /></Field>
    <Field label="Address Line 2 (optional)"><Input className="h-11 rounded-[10px]" value={form.addressLine2} onChange={update("addressLine2")} /></Field>
    <Field label="Landmark (optional)"><Input className="h-11 rounded-[10px]" value={form.landmark} onChange={update("landmark")} /></Field>
    <Field label="City / Town"><Input required className="h-11 rounded-[10px]" value={form.city} onChange={update("city")} /></Field>
    <Field label="District"><Input required className="h-11 rounded-[10px]" value={form.district} onChange={update("district")} /></Field>
    <Field label="State / UT"><StateSelect value={form.stateUt} onChange={updateState} /></Field>
    <Field label="PIN Code" hint="Exactly 6 digits"><Input required inputMode="numeric" pattern="\d{6}" maxLength={6} className="h-11 rounded-[10px]" value={form.pinCode} onChange={(event) => setForm((current) => ({ ...current, pinCode: event.target.value.replace(/\D/g, "").slice(0, 6) }))} /></Field>
    <Field label="Location Code" icon={KeyRound} hint="Automatically generated. You can edit it."><Input required className="h-11 rounded-[10px] bg-[#FAF8F5] pl-10 font-semibold" value={previewCode} onChange={updateLocationCode} /></Field>
    {editing && <label className="flex h-11 items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={form.active} onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))} /> Active</label>}
    <Button type="submit" className="h-11 rounded-[10px] bg-[var(--cc-primary)] font-semibold text-white hover:bg-[var(--cc-primary-dark)] disabled:bg-[#F9A0A8] sm:col-span-2" disabled={pending}>{pending ? "Saving..." : editing ? "Save Location" : "Add Location"}</Button>{error && <p className="text-sm text-[var(--cc-error)] sm:col-span-2">{error}</p>}
  </form></DialogContent></Dialog>;
}

export function ControlCenterLocations() {
  const { data = [], isLoading, error } = useQuery(adminLocationsOptions());
  const { activeLocation } = useActiveLocation();
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [generatedCode, setGeneratedCode] = useState("");
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({ payload, photo, previewCode }) => createAdminLocation({ ...payload, country: "India", name: payload.name.trim(), addressLine1: payload.addressLine1.trim(), addressLine2: (payload.addressLine2 || "").trim(), landmark: (payload.landmark || "").trim(), city: payload.city.trim(), district: payload.district.trim(), stateUt: payload.stateUt.trim(), pinCode: payload.pinCode.trim(), active: true }, photo).then((created) => ({ created, previewCode })),
    onSuccess: ({ created, previewCode }) => {
      const code = created?.code || created?.locationCode || created?.data?.code || previewCode || "";
      setGeneratedCode(code);
      queryClient.invalidateQueries({ queryKey: ["admin", "locations"] });
      toast.success(code ? `Location created with code ${code}.` : "Location created.");
    },
  });
  const editMutation = useMutation({
    mutationFn: ({ id, payload, photo }) => updateAdminLocation(id, payload, photo),
    onSuccess: () => { setLocationDialogOpen(false); setEditingLocation(null); queryClient.invalidateQueries({ queryKey: ["admin", "locations"] }); toast.success("Location updated."); },
  });
  const apiError = mutation.error?.response?.status === 409
    ? mutation.error?.response?.data?.message || "Location code already exists. Please use a different code."
    : mutation.error?.response?.status === 403
      ? "Only a Super Admin can add locations."
      : mutation.error?.response?.data?.message || mutation.error?.response?.data || mutation.error?.message;
  return <Shell title="Locations" description="Create and manage operating locations.">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-[var(--cc-secondary-text)]">{activeLocation?.name ? `Current location: ${activeLocation.name}` : "Configure locations for operations and access."}</p><Button className="h-11 w-full rounded-[10px] bg-[var(--cc-primary)] font-semibold text-white hover:bg-[var(--cc-primary-dark)] sm:w-auto" onClick={() => { setGeneratedCode(""); setEditingLocation(null); setLocationDialogOpen(true); }}><Plus className="size-[18px]" /> Add Location</Button></div>
    {isLoading ? <p className="text-sm text-[var(--cc-muted-text)]">Loading locations...</p> : <div className="grid gap-3 lg:grid-cols-2">{data.map((location) => <LocationCard key={location.id} location={location} onEdit={(item) => { setEditingLocation(item); setLocationDialogOpen(true); }} />)}{!data.length && <p className="rounded-[16px] border border-[var(--cc-border)] bg-white p-8 text-center text-sm text-[var(--cc-muted-text)] lg:col-span-2">No locations are configured.</p>}</div>}
    <ErrorState error={error} />
    <LocationDialog key={`${editingLocation?.id || "new"}-${locationDialogOpen}-${generatedCode}`} open={locationDialogOpen} onOpenChange={setLocationDialogOpen} initial={editingLocation} pending={editingLocation ? editMutation.isPending : mutation.isPending} error={editingLocation ? editMutation.error?.response?.data?.message || editMutation.error?.message : apiError} onSave={(payload) => { const { photo, removePhoto, ...editablePayload } = payload; const previewCode = editablePayload.code; if (editingLocation) editMutation.mutate({ id: editingLocation.id, payload: { ...editablePayload, removePhoto }, photo }); else mutation.mutate({ payload: editablePayload, photo, previewCode }); }} />
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
        className="flex h-11 w-full min-w-[150px] items-center gap-1.5 rounded-[10px] border border-[var(--cc-border)] bg-white px-3 text-left"
      >
        <MapPin className="size-[15px] shrink-0 text-[var(--cc-primary)]" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--cc-text)]">{label}</span>
        <ChevronDown className={`size-3.5 shrink-0 text-[var(--cc-muted-text)] transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+6px)] z-20 max-h-64 w-56 overflow-y-auto rounded-[16px] border border-[var(--cc-border)] bg-white p-1.5 shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
          <button type="button" className={`flex min-h-11 w-full items-center gap-2 rounded-[10px] px-2.5 text-left text-sm ${value === ALL_LOCATIONS_VALUE ? "bg-[var(--cc-primary-light)] font-semibold text-[var(--cc-primary-dark)]" : "text-[var(--cc-text)] hover:bg-[var(--cc-page)]"}`} onClick={() => { onChange(ALL_LOCATIONS_VALUE); setOpen(false); }}>
            <Globe2 className="size-4 shrink-0" aria-hidden="true" /><span className="flex-1">All Locations</span>{value === ALL_LOCATIONS_VALUE && <Check className="size-4" aria-hidden="true" />}
          </button>
          {locations.map((location) => {
            const active = String(location.id) === value;
            return (
              <button key={location.id} type="button" className={`flex min-h-11 w-full items-center gap-2 rounded-[10px] px-2.5 text-left text-sm ${active ? "bg-[var(--cc-primary-light)] font-semibold text-[var(--cc-primary-dark)]" : "text-[var(--cc-text)] hover:bg-[var(--cc-page)]"}`} onClick={() => { onChange(String(location.id)); setOpen(false); }}>
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
    <div className="flex min-h-[72px] items-center gap-3 border-b border-[var(--cc-divider)] px-3 py-3 last:border-0">
      <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--cc-primary-light)] text-[var(--cc-primary)]">
        <Building2 className="size-5" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold text-[var(--cc-text)]">{company.name}</p>
        <p className="truncate text-xs text-[var(--cc-secondary-text)]">{subtitle}</p>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger className="grid size-11 shrink-0 place-items-center rounded-[10px] text-[var(--cc-muted-text)] hover:bg-[var(--cc-primary-light)]" aria-label={`Actions for ${company.name}`} disabled={busy}>
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

  return <Shell title="Customer Companies" description="Manage customer companies and their operating locations.">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><CompanyLocationSelector locations={locations} value={selectedLocationId} onChange={setSelectedLocationId} /><span className="text-xs text-[var(--cc-secondary-text)]">{isAllLocations ? "Viewing all companies" : `Viewing ${selectedLocation?.name || "selected location"}`}</span></div>

    <form onSubmit={handleSubmit} className="space-y-3 rounded-[16px] border border-[var(--cc-border)] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      <p className="text-[15px] font-semibold text-[var(--cc-text)]">Add Customer Company</p>
      <Input
        ref={nameInputRef}
        className="h-11 rounded-[10px] border-[var(--cc-border)]"
        placeholder="Company name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        maxLength={COMPANY_NAME_MAX}
        aria-invalid={!!nameError}
      />
      {nameError && <p className="text-xs text-[var(--cc-error)]">{nameError}</p>}
      {isAllLocations && <p className="text-xs text-[var(--cc-secondary-text)]">Select a specific location to add a company.</p>}
      <Button type="submit" disabled={!canSubmit} className="h-11 w-full rounded-[10px] bg-[var(--cc-primary)] text-sm font-semibold text-white hover:bg-[var(--cc-primary-dark)] disabled:bg-[#F9A0A8]">
        {createMutation.isPending ? "Adding…" : "Add Customer Company"}
      </Button>
    </form>

    <div>
      <div className="mb-2 flex items-center gap-2">
        <h3 className="text-[15px] font-semibold text-[var(--cc-text)]">Customer Companies</h3>
        <span className="rounded-full bg-[var(--cc-primary-light)] px-2.5 py-1 text-xs font-semibold text-[var(--cc-primary-dark)]">{visibleCount}</span>
      </div>
      <div className="rounded-[16px] border border-[var(--cc-border)] bg-white">
        {(companiesLoading || locationsLoading || (!isAllLocations && assignedQuery.isLoading)) && <p className="p-4 text-center text-sm text-[var(--cc-muted-text)]">Loading...</p>}
        {!companiesLoading && !visibleCompanies.length && (
          <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
            <p className="text-sm font-semibold text-[var(--cc-text)]">No customer companies</p>
            <p className="text-xs text-[var(--cc-secondary-text)]">{isAllLocations ? "No Customer Companies have been created yet." : `No companies are assigned to ${selectedLocation?.name || "this location"} yet.`}</p>
            {!isAllLocations && <Button type="button" className="h-11 rounded-[10px] bg-[var(--cc-primary)] text-white hover:bg-[var(--cc-primary-dark)]" onClick={() => nameInputRef.current?.focus()}>Add Customer Company</Button>}
          </div>
        )}
        {visibleCompanies.map((company) => (
          editingId === company.id ? (
            <div key={company.id} className="flex min-h-[72px] items-center gap-2 border-b border-[var(--cc-divider)] p-3 last:border-0">
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
  const { data: createOptions } = useQuery(adminCreateUserOptions());
  const [selectedId, setSelectedId] = useState(null);
  const [userSearch, setUserSearch] = useState("");
  const [userPickerOpen, setUserPickerOpen] = useState(false);
  const selectedUser = users.find((item) => String(item.id) === String(selectedId)) || null;
  const assignedQuery = useQuery(userLocationsOptions(selectedUser?.id));
  const [role, setRole] = useState("");
  const [selectedLocations, setSelectedLocations] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const queryClient = useQueryClient();
  const assignableRoles = createOptions?.roles || defaultAssignableRoles;

  useEffect(() => {
    if (!selectedUser) return;
    const timer = window.setTimeout(() => {
      setSelectedId(selectedUser.id);
      setRole(assignableRoles.includes(selectedUser.role) ? selectedUser.role : assignableRoles[0] || "");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [selectedUser, assignableRoles]);
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
  const visibleUsers = users.filter((item) => `${item.name || item.fullName || item.username || ""} ${item.phone || item.email || ""}`.toLowerCase().includes(userSearch.trim().toLowerCase()));
  const userName = (item) => item?.name || item?.fullName || item?.username || item?.email || "Unnamed user";
  const userSecondary = (item) => item?.phone || item?.phoneNumber || item?.email || "";

  return <Shell title="Access Management" description="Manage each user's role and authorized operating locations.">
    <div className="grid gap-5 lg:grid-cols-[minmax(18rem,.8fr)_minmax(0,1.2fr)]">
      <section className="rounded-[16px] border border-[var(--cc-border)] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.06em] text-[#77716D]">Select User</p>
        <Popover open={userPickerOpen} onOpenChange={setUserPickerOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={selectedUser ? `Selected user ${userName(selectedUser)}` : "Select a user"}
              className="flex h-11 w-full items-center gap-2 rounded-[10px] border border-[var(--cc-border)] bg-white px-3 text-left text-[13px] transition-colors hover:border-[var(--cc-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cc-primary)]/30"
            >
              <UserRound className="size-4 shrink-0 text-[var(--cc-primary)]" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate font-semibold text-[var(--cc-text)]">
                {selectedUser ? userName(selectedUser) : "Select a user"}
              </span>
              <ChevronDown className="size-4 shrink-0 text-[var(--cc-muted-text)]" aria-hidden="true" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-[calc(100vw-2rem)] max-w-[28rem] gap-0 overflow-hidden rounded-[12px] border-[var(--cc-border)] bg-white p-0 shadow-lg sm:w-[24rem]"
          >
            <div className="border-b border-[#F0ECE8] p-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--cc-muted-text)]" aria-hidden="true" />
                <Input
                  autoFocus
                  className="h-10 rounded-[10px] border-[var(--cc-border)] pl-9 text-[13px]"
                  placeholder="Search users..."
                  value={userSearch}
                  onChange={(event) => setUserSearch(event.target.value)}
                  aria-label="Search users"
                />
              </div>
            </div>
            <div className="max-h-[min(320px,calc(100dvh-12rem))] overflow-y-auto">
              {usersLoading ? <p className="p-4 text-center text-sm text-[var(--cc-muted-text)]">Loading users...</p> : visibleUsers.length === 0 ? (
                <p className="p-4 text-center text-sm text-[var(--cc-muted-text)]">No matching users.</p>
              ) : visibleUsers.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => {
                    setSelectedId(item.id);
                    setUserPickerOpen(false);
                    setUserSearch("");
                  }}
                  className={`flex min-h-[52px] w-full items-center gap-3 border-b border-[#F0ECE8] px-3 py-2 text-left transition-colors last:border-0 hover:bg-[var(--cc-page)] ${String(item.id) === String(selectedUser?.id) ? "bg-[var(--cc-primary-light)]" : ""}`}
                >
                  <UserRound className="size-4 shrink-0 text-[var(--cc-primary)]" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-[var(--cc-text)]">{userName(item)}</span>
                    <span className="block truncate text-[11px] text-[var(--cc-secondary-text)]">{userSecondary(item) || "No phone or email available"}</span>
                  </span>
                  <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-[var(--cc-muted-text)]">{humanRole(item.role)}</span>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        {!selectedUser && !usersLoading && <p className="mt-3 text-sm text-[var(--cc-secondary-text)]">Select a user to manage their role and authorized locations.</p>}
        <ErrorState error={usersError || locationsError} />
      </section>
      {selectedUser && <section className="rounded-[16px] border border-[var(--cc-border)] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)]"><p className="mb-4 text-[11px] font-bold uppercase tracking-[0.06em] text-[#77716D]">User Access</p>
        {loading && <p className="text-sm text-[var(--cc-muted-text)]">Loading access...</p>}
        {selectedUser && !loading && <div className="space-y-5"><div><p className="text-base font-semibold text-[var(--cc-text)]">{selectedUser.name || selectedUser.fullName || selectedUser.username || selectedUser.email}</p><Field label="Role" icon={ShieldCheck}><select id="user-role" className="h-11 w-full rounded-[10px] border border-[var(--cc-border)] bg-white px-10 text-sm" value={role} onChange={(event) => setRole(event.target.value)}>{assignableRoles.map((value) => <option key={value} value={value}>{humanRole(value)}</option>)}</select></Field></div>
          <fieldset><legend className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#77716D]">Authorized Locations</legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{locations.map((location) => { const checked = selectedLocations.includes(String(location.id)); return <label key={location.id} className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-[10px] border px-3 text-sm ${checked ? "border-[var(--cc-primary)] bg-[var(--cc-primary-light)]" : "border-[var(--cc-border)]"}`}><input type="checkbox" className="size-4 accent-[var(--cc-primary)]" checked={checked} onChange={() => toggleLocation(location.id)} /><span>{location.name || location.title || `Location ${location.id}`}</span></label>; })}</div></fieldset>
          <Button className="h-11 w-full rounded-[10px] bg-[var(--cc-primary)] font-semibold text-white hover:bg-[var(--cc-primary-dark)]" disabled={!canSave} onClick={() => { setFeedback(null); saveMutation.mutate(); }}>{saveMutation.isPending ? "Saving..." : <><Check className="size-4" /> Save Access</>}</Button>
          {feedback && <p role="status" className={feedback.type === "error" ? "text-sm text-[var(--cc-error)]" : "text-sm text-[var(--cc-success)]"}>{feedback.text}</p>}
        </div>}
        <ErrorState error={assignedQuery.error} />
      </section>}
    </div>
  </Shell>;
}

// A single reusable row for one payment method's status/control — mirrors the
// existing ToggleRow pattern used on /admin/global-controls (Settings).
function PaymentMethodRow({ icon, title, description, enabled, onToggle, readOnly, loading }) {
  const Icon = icon;
  return (
    <div className="flex min-h-[72px] items-center gap-3 border-b border-[var(--cc-divider)] px-4 last:border-0">
      <div className={`grid size-10 shrink-0 place-items-center rounded-xl ${enabled ? "bg-[var(--cc-success-bg)] text-[var(--cc-success)]" : "bg-[var(--cc-page)] text-[var(--cc-muted-text)]"}`}>
        <Icon className="size-5" strokeWidth={1.9} aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[var(--cc-text)]">{title}</p>
        <p className="truncate text-xs text-[var(--cc-secondary-text)]">{description}</p>
      </div>
      {readOnly
        ? <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${enabled ? "bg-[var(--cc-success-bg)] text-[var(--cc-success)]" : "bg-[var(--cc-page)] text-[var(--cc-muted-text)]"}`}>{enabled ? "Enabled" : "Disabled"}</span>
        : <Switch checked={!!enabled} onCheckedChange={onToggle} disabled={loading || enabled === null || enabled === undefined} aria-label={`Toggle ${title}`} className="data-[checked]:bg-[var(--cc-primary)]" />}
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

  return <Shell title="Payment Management" description="Configure available customer payment methods.">
    <Card className="rounded-[16px] border-[var(--cc-border)] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      <CardHeader className="border-b border-[var(--cc-divider)] py-4"><CardTitle className="text-[15px] font-semibold text-[var(--cc-text)]">Payment methods</CardTitle></CardHeader>
      <CardContent className="p-0">
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
