import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useNavigate, useSearch } from "@tanstack/react-router";
import { toast } from "sonner";
import { Bell, Building2, Check, ChevronDown, Eye, EyeOff, IndianRupee, KeyRound, MapPin, Menu, MoreHorizontal, MoreVertical, Plus, Search, ShieldCheck, UserRound, Wallet } from "lucide-react";
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
import { paymentConfigOptions } from "@/query/options/orders";
import { adminSetPaymentMethod, getAdminSettings } from "@/services/order-service";
import { partyOrdersOptions } from "@/query/options/party-orders";
import { adminHallOfHappinessOptions } from "@/query/options/admin-hall-of-happiness";
import { adminCreateUserOptions, adminCustomerCompaniesOptions, adminLocationsOptions, adminLocationsPageOptions, adminUsersOptions, adminVendorsOptions, assignCustomerCompany, createAdminLocation, createAdminUser, createManagementResource, deleteAdminLocation, grantUserLocation, revokeUserLocation, setAdminLocationActive, updateAdminLocation, updateCustomerCompany, updateUserRole, userLocationsOptions } from "@/query/options/management";
import { baseURL } from "@/services";
import { ControlCenterThumbnail } from "@/components/admin/ControlCenterThumbnail";

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
  { to: "/admin/control-center/invoice-management", label: "Invoice Management", roles: [ROLE.SUPER_ADMIN] },
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
    <header className="sticky top-0 z-40 w-full border-b border-[var(--cc-divider)] bg-white">
      <div className="mx-auto grid h-14 w-full max-w-[1280px] grid-cols-[44px_minmax(0,1fr)_44px] items-center px-3 min-[360px]:px-3.5 min-[390px]:px-4 md:h-16 md:px-6">
        <button type="button" onClick={toggleSidebar} aria-label="Open menu" className="grid size-11 shrink-0 place-items-center rounded-[10px] text-[var(--cc-text)] transition-colors hover:bg-[var(--cc-primary-light)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cc-primary)]/30">
          <Menu className="size-5" strokeWidth={1.9} aria-hidden="true" />
        </button>
        <h1 className="min-w-0 text-center text-[18px] font-semibold leading-6 text-[var(--cc-text)]">Control Center</h1>
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
    <nav aria-label="Control Center navigation" className="relative z-30 mx-auto w-full min-w-0 max-w-[1200px] box-border px-3 py-3 min-[360px]:px-3.5 min-[390px]:px-4 md:px-6">
      <div className="flex min-h-11 w-full min-w-0 items-center gap-0.5 rounded-full border border-[var(--cc-border)] bg-white p-1 min-[360px]:gap-1">
        {visiblePrimary.map(({ to, label }) => {
          const active = pathname === to;
          return <Link key={to} to={to} className={`flex min-h-10 min-w-0 flex-1 items-center justify-center rounded-full px-1 text-[11px] font-semibold transition-colors min-[360px]:px-2 min-[360px]:text-xs sm:px-3 sm:text-[13px] ${active ? "bg-[#24211F] text-white" : "text-[#24211F] hover:bg-[var(--cc-primary-light)]"}`}>{label}</Link>;
        })}
        {visibleMore.length > 0 && (
          <div ref={moreRef} className="relative min-w-0 flex-1">
            <button type="button" aria-haspopup="menu" aria-expanded={moreOpen} onClick={() => setMoreOpen((current) => !current)} className={`flex min-h-10 w-full min-w-0 items-center justify-center gap-0.5 rounded-full px-1 text-[11px] font-semibold transition-colors min-[360px]:gap-1 min-[360px]:px-2 min-[360px]:text-xs sm:px-3 sm:text-[13px] ${moreActive || moreOpen ? "bg-[#24211F] text-white" : "text-[#24211F] hover:bg-[var(--cc-primary-light)]"}`}>
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
  return <div className="mx-auto w-full min-w-0 max-w-[1280px] box-border px-3 pt-2 min-[360px]:px-3.5 min-[390px]:px-4 md:px-6">
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
            queryClient.invalidateQueries({ queryKey: ["payment", "config"] });
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
    <main className="admin-control-center box-border min-h-screen w-full min-w-0 max-w-[100vw] bg-[var(--cc-page)] pb-10 text-[var(--cc-text)]">
      <ControlCenterHeader />
      {showLocationContext && <ControlCenterLocationContext />}
      <ControlCenterNavigation />
      <div className="mx-auto w-full min-w-0 max-w-[100vw] space-y-5 px-3 min-[360px]:px-3.5 min-[390px]:px-4 md:max-w-[1200px] md:px-6">
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

function ManagementCard({ to, title, count, description, theme }) {
  const isBadge = typeof count === "string";
  return (
    <Link to={to} className="flex min-h-[92px] items-start gap-2.5 rounded-[14px] border border-[var(--cc-border)] bg-[var(--cc-card)] p-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] transition duration-150 hover:-translate-y-px hover:border-[var(--cc-primary)]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cc-primary)]/30 min-[360px]:min-h-[100px] min-[360px]:gap-3 min-[360px]:p-3 md:min-h-[96px] md:max-h-[108px]">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-[12px] overflow-hidden bg-[#F8F8FA] min-[360px]:size-11 min-[390px]:size-12">
        <ControlCenterThumbnail theme={theme} className="size-full" />
      </div>
      <div className="min-w-0 flex-1">
        {isBadge ? (
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <p className="min-w-0 text-[13px] font-semibold leading-[16px] text-[var(--cc-text)]">{title}</p>
            <span className="shrink-0 rounded-full bg-[var(--cc-primary-light)] px-2 py-0.5 text-[10px] font-semibold leading-3 text-[var(--cc-primary-dark)]">{count}</span>
          </div>
        ) : (
          <div className="flex min-w-0 items-start justify-between gap-1.5">
            <p className="min-w-0 flex-1 text-[13px] font-semibold leading-[16px] text-[var(--cc-text)] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] [overflow-wrap:break-word] [overflow:hidden]">{title}</p>
            <p className="shrink-0 text-xl font-bold leading-6 text-[var(--cc-text)]">{count ?? 0}</p>
          </div>
        )}
        <p className="mt-1.5 line-clamp-3 min-w-0 text-[10px] leading-[14px] text-[var(--cc-muted-text)] [overflow-wrap:anywhere]">{description} <span aria-hidden="true">→</span></p>
      </div>
    </Link>
  );
}

export function ControlCenterOverview() {
  const { data: users = [], error: usersError } = useQuery(adminUsersOptions());
  const { data: locations = [], error: locationsError } = useQuery(adminLocationsOptions());
  const { data: companies = [], error: companiesError } = useQuery(adminCustomerCompaniesOptions());
  const { data: vendors = [], error: vendorsError } = useQuery(adminVendorsOptions());
  const { data: partyOrders = [], error: partyOrdersError } = useQuery(partyOrdersOptions);
  const { data: hallData, error: hallError } = useQuery(adminHallOfHappinessOptions({ page: 0, size: 100 }));
  const { data: paymentConfig, error: paymentError } = useQuery(paymentConfigOptions);
  const hallPhotos = hallData?.content || [];
  const pendingHall = hallPhotos.filter((photo) => ["CUSTOMER_UPLOAD", "PENDING", "PENDING_REVIEW"].includes(photo.status)).length;
  const enabledPayments = [paymentConfig?.walletEnabled, paymentConfig?.razorpayEnabled, paymentConfig?.payAtStallEnabled].filter(Boolean).length;

  const groups = [
    {
      label: "Organization",
      cards: [
        { to: "/admin/control-center/users", title: "Users", count: users.length, theme: "users", description: "Manage internal accounts and access" },
        { to: "/admin/control-center/locations", title: "Locations", count: locations.length, theme: "locations", description: "Configure operating locations" },
        { to: "/admin/control-center/customer-companies", title: "Customer Companies", count: companies.length, theme: "customerCompanies", description: "Manage company assignments" },
        { to: "/admin/vendors", title: "Vendors", count: vendors.length, theme: "vendors", description: "Manage vendors and costs" },
      ],
    },
    {
      label: "Security & Configuration",
      cards: [
        { to: "/admin/control-center/access", title: "Access", count: "Configured", theme: "access", description: "Manage roles" },
        { to: "/admin/control-center/payments", title: "Payment Management", count: enabledPayments, theme: "payments", description: "Configure payment methods" },
      ],
    },
    {
      label: "Operations",
      cards: [
        { to: "/admin/party-orders", title: "Party Orders", count: partyOrders.filter((order) => !["COMPLETED", "CANCELLED"].includes(order.status)).length, theme: "partyOrders", description: "Review Party/Event orders" },
        { to: "/admin/hall-of-happiness", title: "Hall of Happiness", count: pendingHall, theme: "hallOfHappiness", description: pendingHall ? "Pending review" : "No pending reviews" },
      ],
    },
  ];

  const errors = [usersError, locationsError, companiesError, vendorsError, partyOrdersError, hallError, paymentError].filter(Boolean);

  return <Shell title="Control Center" description="Manage your Bro & Bro operations." showLocationContext={false}>
   {errors.length > 0 && (
     <div className="rounded-[10px] border border-[var(--cc-error)]/20 bg-[var(--cc-error-bg)] p-4 text-sm text-[var(--cc-error)]">
       ⚠️ Some dashboard data failed to load. Please refresh the page if counts are missing.
     </div>
   )}
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
    <div className="relative min-w-0">
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

function UserAccessDialog({ user, open, onOpenChange, query }) {
  const locations = query.data || [];
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[calc(100vh-32px)] overflow-y-auto rounded-[20px] border border-[var(--cc-border)] bg-white p-5 shadow-[0_12px_40px_rgba(0,0,0,0.16)] sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="text-lg font-semibold text-[var(--cc-text)]">User access</DialogTitle>
        <DialogDescription className="text-sm text-[var(--cc-secondary-text)]">
          Active locations authorized for {user?.name || user?.fullName || user?.username || "this user"}.
        </DialogDescription>
      </DialogHeader>
      {query.isLoading && <p className="text-sm text-[var(--cc-muted-text)]">Loading access...</p>}
      {query.error && <ErrorState error={query.error} />}
      {!query.isLoading && !query.error && <div className="space-y-2">
        {locations.map((item) => { const location = item.location || item; return <div key={location.id} className="flex min-h-11 items-center gap-2 rounded-[10px] border border-[var(--cc-border)] px-3 text-sm text-[var(--cc-text)]"><MapPin className="size-4 shrink-0 text-[var(--cc-primary)]" /><span className="flex-1">{location.name || location.title || `Location ${location.id}`}</span><span className="text-xs font-semibold text-[var(--cc-muted-text)]">{humanRole(item.role)}</span></div>; })}
        {!locations.length && <p className="rounded-[10px] border border-dashed border-[var(--cc-border)] p-4 text-center text-sm text-[var(--cc-muted-text)]">No active location access assigned.</p>}
      </div>}
    </DialogContent>
  </Dialog>;
}

function UserCard({ user, onViewAccess }) {
  const active = user.active ?? user.enabled ?? true;
  return <div className="flex min-h-[76px] items-center gap-3 rounded-[16px] border border-[var(--cc-border)] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
    <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--cc-primary-light)] text-[var(--cc-primary)]"><UserRound className="size-5" /></div>
    <div className="min-w-0 flex-1"><p className="truncate text-[15px] font-semibold text-[var(--cc-text)]">{user.name || user.fullName || user.username || "Unnamed user"}</p><p className="truncate text-xs text-[var(--cc-secondary-text)]">{user.phone || user.whatsappNumber || user.email || "No phone number"}</p></div>
    <div className="hidden items-end gap-1.5 sm:flex sm:flex-col"><span className="rounded-full bg-[var(--cc-primary-light)] px-2.5 py-1 text-xs font-semibold text-[var(--cc-primary-dark)]">{humanRole(user.role || user.roles?.[0])}</span><span className={`text-xs ${active ? "text-[var(--cc-success)]" : "text-[var(--cc-muted-text)]"}`}>{active ? "Active" : "Inactive"}</span></div>
    <DropdownMenu><DropdownMenuTrigger className="grid size-11 shrink-0 place-items-center rounded-[10px] text-[var(--cc-muted-text)] hover:bg-[var(--cc-primary-light)]" aria-label={`Actions for ${user.name || "user"}`}><MoreVertical className="size-5" /></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => onViewAccess(user)}>View access</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
  </div>;
}

export function ControlCenterUsers() {
  const { data: options, isLoading: optionsLoading, error: optionsError } = useQuery(adminCreateUserOptions());
  const [locationFilter, setLocationFilter] = useState("ALL");
  const { data = [], isLoading, error } = useQuery(adminUsersOptions(
    locationFilter === "ALL" ? undefined : { locationId: Number(locationFilter) },
  ));
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: "", phone: "", password: "", role: "", locationId: "" });
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [accessUser, setAccessUser] = useState(null);
  const accessQuery = useQuery(userLocationsOptions(accessUser?.id, Boolean(accessUser)));
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
  return <Shell title="Users" description="Create and manage internal users." showLocationContext={false}>
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="relative w-full sm:max-w-sm"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--cc-muted-text)]" /><Input className="h-11 rounded-[10px] border-[var(--cc-border)] bg-white pl-10" placeholder="Search name or WhatsApp number" value={search} onChange={(event) => setSearch(event.target.value)} /></div><Button className="h-11 w-full rounded-[10px] bg-[var(--cc-primary)] text-sm font-semibold text-white hover:bg-[var(--cc-primary-dark)] sm:w-auto" onClick={() => setCreateOpen(true)}><Plus className="size-[18px]" /> Create User</Button></div>
    <div className="grid grid-cols-1 gap-2 sm:max-w-2xl sm:grid-cols-3"><select aria-label="Filter users by location" className="h-11 rounded-[10px] border border-[var(--cc-border)] bg-white px-3 text-sm" value={locationFilter} onChange={(event) => setLocationFilter(event.target.value)}><option value="ALL">All Locations</option>{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select><select className="h-11 rounded-[10px] border border-[var(--cc-border)] bg-white px-3 text-sm" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}><option value="ALL">All Roles</option>{[...new Set(data.map((user) => user.role || user.roles?.[0]).filter(Boolean))].map((role) => <option key={role} value={role}>{humanRole(role)}</option>)}</select><select className="h-11 rounded-[10px] border border-[var(--cc-border)] bg-white px-3 text-sm" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="ALL">All Status</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></div>
    {isLoading ? <p className="text-sm text-[var(--cc-muted-text)]">Loading users...</p> : <div className="grid gap-3 lg:grid-cols-2">{filteredUsers.map((user) => <UserCard key={user.id} user={user} onViewAccess={setAccessUser} />)}{!filteredUsers.length && <p className="rounded-[16px] border border-[var(--cc-border)] bg-white p-8 text-center text-sm text-[var(--cc-muted-text)] lg:col-span-2">No users match these filters.</p>}</div>}
    <ErrorState error={error} />
    <UserCreateDialog open={createOpen} onOpenChange={setCreateOpen} form={form} setForm={setForm} roles={roles} locations={locations} optionsLoading={optionsLoading} mutation={mutation} apiError={apiError} optionsError={optionsError} />
    <UserAccessDialog user={accessUser} open={Boolean(accessUser)} onOpenChange={(open) => { if (!open) setAccessUser(null); }} query={accessQuery} />
  </Shell>;
}

function LocationCard({ location, onEdit, onDelete, onToggleActive }) {
  const active = location.active ?? true;
  return <div className="flex items-center gap-3 rounded-[16px] border border-[var(--cc-border)] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
    <LocationThumbnail key={location.locationPhotoUrl || "location-pin"} url={location.locationPhotoUrl} locationId={location.id} name={location.name} />
    <div className="min-w-0 flex-1"><p className="break-words text-base font-semibold leading-5 text-[var(--cc-text)]">{location.name}</p><div className="mt-1 flex min-w-0 flex-wrap items-center gap-2"><span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${active ? "bg-[var(--cc-success-bg)] text-[var(--cc-success)]" : "bg-[var(--cc-page)] text-[var(--cc-muted-text)]"}`}>{active ? "Active" : "Inactive"}</span><p className="break-all text-xs text-[#77716D]">{location.code || location.locationCode || "Generated on save"}</p></div><p className="mt-1 break-words text-[13px] leading-4 text-[var(--cc-secondary-text)]">{[location.addressLine1, location.city, location.stateUt, location.pinCode].filter(Boolean).join(", ") || location.address || "No address provided"}</p></div>
    <DropdownMenu><DropdownMenuTrigger className="grid size-11 shrink-0 place-items-center rounded-[10px] text-[var(--cc-muted-text)] hover:bg-[var(--cc-primary-light)]" aria-label={`Actions for ${location.name}`}><MoreVertical className="size-5" /></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => onEdit(location)}>Edit location</DropdownMenuItem><DropdownMenuItem onClick={() => onToggleActive(location)}>{active ? "Deactivate location" : "Activate location"}</DropdownMenuItem><DropdownMenuItem onClick={() => onDelete(location)} className="text-[var(--cc-error)]">Delete location</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
  </div>;
}

function LocationThumbnail({ url, locationId, name }) {
  const [failed, setFailed] = useState(false);
  if (!url || failed) {
    return <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--cc-primary-light)] text-[var(--cc-primary)]"><MapPin className="size-5" /></div>;
  }
  const imageUrl = `${baseURL}/api/public/location-images/${locationId}`;
  return <img src={imageUrl} alt={`${name || "Location"} photo`} loading="lazy" onError={() => setFailed(true)} className="size-10 shrink-0 rounded-xl object-cover" />;
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
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[calc(100vh-32px)] w-[calc(100vw-32px)] max-w-[calc(100vw-32px)] min-w-0 overflow-y-auto rounded-[20px] border border-[var(--cc-border)] bg-white p-5 shadow-[0_12px_40px_rgba(0,0,0,0.16)] sm:max-w-2xl"><DialogHeader className="min-w-0"><DialogTitle className="text-lg font-semibold break-words">{editing ? "Edit Location" : "Add Location"}</DialogTitle><DialogDescription className="text-sm break-words text-[var(--cc-secondary-text)]">{editing ? "Update the structured operating location details." : "Create an India-based operating location."}</DialogDescription></DialogHeader><form className="grid min-w-0 gap-4 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); onSave({ ...form, code: locationCodeManuallyEdited ? form.code : "", photo, removePhoto }); }}>
    <Field label="Location Name" icon={MapPin}><Input required className="h-11 rounded-[10px] pl-10" value={form.name} onChange={update("name")} /></Field>
    <div className="min-w-0 space-y-1.5 sm:col-span-2"><span className="flex items-center gap-1 text-xs font-semibold text-[var(--cc-text)]">Location Photo <span className="font-normal text-[var(--cc-muted-text)]">(optional)</span></span><div className="overflow-hidden rounded-[12px] border border-dashed border-[var(--cc-border)] bg-[#FAF8F5] p-3">{photo || (initial?.locationPhotoUrl && !removePhoto) ? <div className="flex min-w-0 flex-wrap items-center gap-3"><img src={photoPreview || initial.locationPhotoUrl} alt={`${form.name || "Location"} preview`} className="h-20 w-32 max-w-full shrink-0 rounded-lg object-cover" /><div className="flex min-w-0 flex-wrap gap-2"><label className="inline-flex h-10 max-w-full cursor-pointer items-center rounded-lg border border-[var(--cc-border)] bg-white px-3 text-sm font-medium">Change Photo<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={selectPhoto} /></label><button type="button" className="h-10 max-w-full rounded-lg border border-[var(--cc-border)] bg-white px-3 text-sm font-medium" onClick={() => { setPhoto(null); setPhotoError(""); setRemovePhoto(true); }}>Remove Photo</button></div></div> : <label className="flex min-h-24 min-w-0 cursor-pointer flex-col items-center justify-center gap-1 text-center text-sm text-[var(--cc-muted-text)]"><span className="font-medium text-[var(--cc-text)]">Upload Photo</span><span className="break-words">JPG, JPEG, PNG or WEBP · max 5 MB · recommended 16:9</span><input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={selectPhoto} /></label>}{photoError && <p className="mt-2 break-words text-xs text-[var(--cc-error)]">{photoError}</p>}</div></div>
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

const DEFAULT_LOCATION_FILTERS = {
  status: "ACTIVE",
  state: "",
  city: "",
  country: "India",
  customerCompanyId: "",
  search: "",
  page: 0,
};

function locationFiltersFromSearch(search) {
  return {
    status: ["ACTIVE", "INACTIVE", "ALL"].includes(String(search.status || "").toUpperCase())
      ? String(search.status).toUpperCase() : "ACTIVE",
    state: String(search.state || ""),
    city: String(search.city || ""),
    country: String(search.country || "India"),
    customerCompanyId: String(search.customerCompanyId || ""),
    search: String(search.search || ""),
    page: Math.max(0, Number(search.page || 0) || 0),
  };
}

function LocationFilterFields({ filters, locations, companies, onChange }) {
  const states = [...new Set(locations.map((location) => location.stateUt).filter(Boolean))].sort();
  const cities = [...new Set(locations
    .filter((location) => !filters.state || location.stateUt === filters.state)
    .map((location) => location.city).filter(Boolean))].sort();
  const countries = [...new Set(locations.map((location) => location.country).filter(Boolean))].sort();
  const selectClass = "h-10 w-full min-w-0 rounded-[10px] border border-[var(--cc-border)] bg-white px-3 text-sm";
  return <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
    <label className="min-w-0 space-y-1 text-xs font-semibold"><span>Status</span><select className={selectClass} value={filters.status} onChange={(event) => onChange({ status: event.target.value })}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option><option value="ALL">All</option></select></label>
    <label className="min-w-0 space-y-1 text-xs font-semibold"><span>State</span><select className={selectClass} value={filters.state} onChange={(event) => onChange({ state: event.target.value, city: "" })}><option value="">All States</option>{states.map((state) => <option key={state} value={state}>{state}</option>)}</select></label>
    <label className="min-w-0 space-y-1 text-xs font-semibold"><span>City</span><select className={selectClass} value={filters.city} onChange={(event) => onChange({ city: event.target.value })}><option value="">All Cities</option>{cities.map((city) => <option key={city} value={city}>{city}</option>)}</select></label>
    <label className="min-w-0 space-y-1 text-xs font-semibold"><span>Country</span><select className={selectClass} value={filters.country} onChange={(event) => onChange({ country: event.target.value })}><option value="">All Countries</option>{countries.map((country) => <option key={country} value={country}>{country}</option>)}</select></label>
    <label className="min-w-0 space-y-1 text-xs font-semibold"><span>Customer Company</span><select className={selectClass} value={filters.customerCompanyId} onChange={(event) => onChange({ customerCompanyId: event.target.value })}><option value="">All Companies</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label>
    <label className="min-w-0 space-y-1 text-xs font-semibold sm:col-span-2 lg:col-span-1"><span>Search</span><Input className="h-10 rounded-[10px] border-[var(--cc-border)]" placeholder="Name, code, city, state or PIN" value={filters.search} onChange={(event) => onChange({ search: event.target.value })} /></label>
  </div>;
}

export function ControlCenterLocations() {
  const navigate = useNavigate();
  const routeSearch = useSearch({ strict: false });
  const urlFilters = locationFiltersFromSearch(routeSearch);
  const filters = urlFilters;
  const [filterDraft, setFilterDraft] = useState(urlFilters);
  const [filterOpen, setFilterOpen] = useState(false);
  const searchDebounce = useRef(null);
  const queryParams = { ...Object.fromEntries(Object.entries(urlFilters).filter(([, value]) => value !== "")), size: 20 };
  const { data: pageData, isLoading, error } = useQuery(adminLocationsPageOptions(queryParams));
  const data = pageData?.content || [];
  const totalPages = pageData?.totalPages || 1;
  const { data: filterLocations = [] } = useQuery(adminLocationsOptions({ status: "ALL" }));
  const { data: companies = [] } = useQuery(adminCustomerCompaniesOptions());
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [generatedCode, setGeneratedCode] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState(null);
  const queryClient = useQueryClient();
  useEffect(() => () => window.clearTimeout(searchDebounce.current), []);
  const commitFilters = (next) => {
    const params = Object.fromEntries(Object.entries(next).filter(([, value]) => value !== ""));
    navigate({ search: params, replace: true });
  };
  const changeFilter = (patch) => {
    const next = { ...filters, ...patch, page: Object.prototype.hasOwnProperty.call(patch, "page") ? patch.page : 0 };
    setFilterDraft(next);
    if (Object.prototype.hasOwnProperty.call(patch, "search")) {
      window.clearTimeout(searchDebounce.current);
      searchDebounce.current = window.setTimeout(() => commitFilters(next), 400);
    } else {
      commitFilters(next);
    }
  };
  const clearFilters = () => {
    const next = { ...DEFAULT_LOCATION_FILTERS };
    setFilterDraft(next);
    setFilterOpen(false);
    commitFilters(next);
  };
  const filterCount = [
    filters.status !== "ACTIVE",
    Boolean(filters.state),
    Boolean(filters.city),
    filters.country !== "India",
    Boolean(filters.customerCompanyId),
    Boolean(filters.search),
  ].filter(Boolean).length;
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
  const deleteMutation = useMutation({
    mutationFn: (id) => deleteAdminLocation(id),
    onSuccess: () => {
      setDeleteConfirmOpen(false);
      setLocationToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "locations"] });
      toast.success("Location deleted successfully.");
    },
    onError: (error) => {
      const errorMessage = error?.response?.data?.message || error?.message || "Failed to delete location.";
      toast.error(errorMessage);
    },
  });
  const activeMutation = useMutation({
    mutationFn: (location) => setAdminLocationActive(location.id, !Boolean(location.active)),
    onSuccess: (_, location) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "locations"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "users", "create-options"] });
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      toast.success(`${location.name} ${location.active ? "deactivated" : "activated"}.`);
    },
    onError: (error) => toast.error(error?.response?.data?.message || error?.message || "Unable to update location status."),
  });
  const apiError = mutation.error?.response?.status === 409
    ? mutation.error?.response?.data?.message || "Location code already exists. Please use a different code."
    : mutation.error?.response?.status === 403
      ? "Only a Super Admin can add locations."
      : mutation.error?.response?.data?.message || mutation.error?.response?.data || mutation.error?.message;
  return <Shell title="Locations" description="Create and manage operating locations." showLocationContext={false}>
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="outline" className="h-10 w-full rounded-[10px] sm:hidden" onClick={() => { setFilterDraft(filters); setFilterOpen(true); }}>Filters{filterCount ? ` · ${filterCount}` : ""}</Button>
        <Button className="h-11 w-full rounded-[10px] bg-[var(--cc-primary)] font-semibold text-white hover:bg-[var(--cc-primary-dark)] sm:w-auto sm:ml-auto" onClick={() => { setGeneratedCode(""); setEditingLocation(null); setLocationDialogOpen(true); }}><Plus className="size-[18px]" /> Add Location</Button>
      </div>
      <div className="hidden min-w-0 sm:block"><LocationFilterFields filters={filters} locations={filterLocations} companies={companies} onChange={changeFilter} />{filterCount > 0 && <Button type="button" variant="outline" className="mt-3 h-9" onClick={clearFilters}>Clear filters</Button>}</div>
    </div>
    <Dialog open={filterOpen} onOpenChange={setFilterOpen}><DialogContent className="max-h-[90vh] w-[calc(100vw-32px)] max-w-[calc(100vw-32px)] overflow-y-auto rounded-[20px] p-5 sm:max-w-lg"><DialogHeader><DialogTitle>Filters</DialogTitle><DialogDescription>Filter authorized operating locations.</DialogDescription></DialogHeader><LocationFilterFields filters={filterDraft} locations={filterLocations} companies={companies} onChange={(patch) => setFilterDraft((current) => ({ ...current, ...patch, ...(patch.state && !filterLocations.some((location) => location.stateUt === patch.state && location.city === current.city) ? { city: "" } : {}) }))} /><div className="flex flex-col gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="outline" className="h-11" onClick={clearFilters}>Clear</Button><Button type="button" className="h-11 bg-[var(--cc-primary)] text-white hover:bg-[var(--cc-primary-dark)]" onClick={() => { const next = { ...filterDraft, page: 0 }; setFilterDraft(next); commitFilters(next); setFilterOpen(false); }}>Apply Filters</Button></div></DialogContent></Dialog>
    {isLoading ? <p className="text-sm text-[var(--cc-muted-text)]">Loading locations...</p> : <><div className="grid gap-3 lg:grid-cols-2">{data.map((location) => <LocationCard key={location.id} location={location} onEdit={(item) => { setEditingLocation(item); setLocationDialogOpen(true); }} onToggleActive={(item) => activeMutation.mutate(item)} onDelete={(item) => { setLocationToDelete(item); setDeleteConfirmOpen(true); }} />)}{!data.length && <div className="rounded-[16px] border border-[var(--cc-border)] bg-white p-8 text-center lg:col-span-2"><p className="text-sm text-[var(--cc-muted-text)]">{filters.search ? `No locations found for "${filters.search}".` : filterCount ? "No locations match your filters." : filters.status === "ACTIVE" ? "No active locations found." : "No locations found."}</p><Button type="button" variant="outline" className="mt-3 h-10" onClick={clearFilters}>Clear Filters</Button></div>}</div>{totalPages > 1 && <div className="flex items-center justify-center gap-3 pt-2"><Button type="button" variant="outline" className="h-10" disabled={filters.page === 0} onClick={() => changeFilter({ page: filters.page - 1 })}>Previous</Button><span className="text-xs text-[var(--cc-muted-text)]">Page {filters.page + 1} of {totalPages}</span><Button type="button" variant="outline" className="h-10" disabled={filters.page + 1 >= totalPages} onClick={() => changeFilter({ page: filters.page + 1 })}>Next</Button></div>}</>}
    <ErrorState error={error} />
    <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
      <DialogContent className="rounded-[20px] border border-[var(--cc-border)] bg-white p-5 shadow-[0_12px_40px_rgba(0,0,0,0.16)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-[var(--cc-text)]">Delete Location</DialogTitle>
          <DialogDescription className="text-sm text-[var(--cc-secondary-text)]">Are you sure you want to delete "{locationToDelete?.name}"? This action cannot be undone.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" className="h-11" onClick={() => setDeleteConfirmOpen(false)} disabled={deleteMutation.isPending}>Cancel</Button>
          <Button type="button" className="h-11 bg-[var(--cc-error)] text-white hover:bg-[var(--cc-error-dark)] disabled:bg-[#F9A0A8]" onClick={() => deleteMutation.mutate(locationToDelete?.id)} disabled={deleteMutation.isPending}>
            {deleteMutation.isPending ? "Deleting..." : "Delete Location"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    <LocationDialog key={`${editingLocation?.id || "new"}-${locationDialogOpen}-${generatedCode}`} open={locationDialogOpen} onOpenChange={setLocationDialogOpen} initial={editingLocation} pending={editingLocation ? editMutation.isPending : mutation.isPending} error={editingLocation ? editMutation.error?.response?.data?.message || editMutation.error?.message : apiError} onSave={(payload) => { const { photo, removePhoto, ...editablePayload } = payload; const previewCode = editablePayload.code; if (editingLocation) editMutation.mutate({ id: editingLocation.id, payload: { ...editablePayload, removePhoto }, photo }); else mutation.mutate({ payload: editablePayload, photo, previewCode }); }} />
  </Shell>;
}

// Compact location-context selector — the Super Admin picks a location first,
// then manages/assigns Customer Companies within that context (mirrors the
// existing location-scoping pattern used across the admin app, but scoped
// locally to this page — it intentionally does not touch the global
// LocationContext used for orders/menu).
function CompanyRow({ company, subtitle, onEdit, onToggleActive, onRemove, busy }) {
  return (
    <div className="flex min-h-[72px] items-center gap-3 border-b border-[var(--cc-divider)] px-3 py-3 last:border-0">
      <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--cc-primary-light)] text-[var(--cc-primary)]">
        <Building2 className="size-5" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="break-words text-[15px] font-semibold text-[var(--cc-text)]">{company.name}</p>
        <p className="break-words text-xs text-[var(--cc-secondary-text)]">{subtitle}</p>
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
  const [createLocationId, setCreateLocationId] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const queryClient = useQueryClient();

  const selectedLocation = locations.find((location) => String(location.id) === createLocationId);
  const visibleCompanies = companies;
  const visibleCount = companies.length;

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "customer-companies"] });
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const trimmed = name.trim();
      const created = await createManagementResource("/api/admin/customer-companies", { name: trimmed, active: true });
      if (createLocationId) {
        await assignCustomerCompany(createLocationId, created.id);
      }
      return created;
    },
    onSuccess: () => {
      setName("");
      setCreateLocationId("");
      toast.success(`Customer Company added to ${selectedLocation?.name || "location"}.`);
      refresh();
    },
    onError: (error) => toast.error(error?.response?.data?.message || error.message || "Unable to add Customer Company."),
  });
  const companyMutation = useMutation({
    mutationFn: ({ company, name, active }) => updateCustomerCompany(company.id, { name, active }),
    onSuccess: refresh,
    onError: (error) => toast.error(error?.response?.data?.message || error.message || "Unable to update Customer Company."),
  });
  const nameInputRef = useRef(null);
  const nameError = name.trim().length > 0 && (name.trim().length < COMPANY_NAME_MIN || name.trim().length > COMPANY_NAME_MAX)
    ? `Company name must be ${COMPANY_NAME_MIN}-${COMPANY_NAME_MAX} characters.`
    : null;
  const canSubmit = name.trim().length >= COMPANY_NAME_MIN && name.trim().length <= COMPANY_NAME_MAX && Boolean(createLocationId) && !createMutation.isPending;

  const handleSubmit = (event) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < COMPANY_NAME_MIN || trimmed.length > COMPANY_NAME_MAX) {
      toast.error(`Company name must be ${COMPANY_NAME_MIN}-${COMPANY_NAME_MAX} characters.`);
      return;
    }
    if (!createLocationId) {
      toast.error("Select a location before adding a company.");
      return;
    }
    createMutation.mutate();
  };

  return <Shell title="Customer Companies" description="Manage customer companies and their operating locations." showLocationContext={false}>
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
      <label className="block space-y-1.5 text-xs font-semibold text-[var(--cc-text)]">
        <span>Operating Location</span>
        <select required aria-label="Operating Location" className="h-11 w-full rounded-[10px] border border-[var(--cc-border)] bg-white px-3 text-sm font-normal" value={createLocationId} onChange={(event) => setCreateLocationId(event.target.value)} disabled={locationsLoading}>
        <option value="">Select operating location</option>
        {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
        </select>
      </label>
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
        {companiesLoading && <p className="p-4 text-center text-sm text-[var(--cc-muted-text)]">Loading...</p>}
        {!companiesLoading && !visibleCompanies.length && (
          <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
            <p className="text-sm font-semibold text-[var(--cc-text)]">No customer companies</p>
            <p className="text-xs text-[var(--cc-secondary-text)]">No Customer Companies have been created yet.</p>
            <Button type="button" className="h-11 rounded-[10px] bg-[var(--cc-primary)] text-white hover:bg-[var(--cc-primary-dark)]" onClick={() => nameInputRef.current?.focus()}>Add Customer Company</Button>
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
              subtitle={`${(company.locationNames || []).join(", ") || "No operating location"} · ${company.active ? "Active" : "Inactive"}`}
              busy={companyMutation.isPending}
              onEdit={() => { setEditingId(company.id); setEditingName(company.name); }}
              onToggleActive={() => companyMutation.mutate({ company, name: company.name, active: !company.active })}
            />
          )
        ))}
      </div>
      <ErrorState error={companiesError || locationsError} />
    </div>
  </Shell>;
}

export function ControlCenterAccess() {
  const [locationFilter, setLocationFilter] = useState("ALL");
  const { data: users = [], isLoading: usersLoading, error: usersError } = useQuery(adminUsersOptions(
    locationFilter === "ALL" ? undefined : { locationId: Number(locationFilter) },
  ));
  const { data: locations = [], isLoading: locationsLoading, error: locationsError } = useQuery(adminLocationsOptions());
  const { data: createOptions } = useQuery(adminCreateUserOptions());
  const [selectedId, setSelectedId] = useState(null);
  const [userSearch, setUserSearch] = useState("");
  const [userPickerOpen, setUserPickerOpen] = useState(false);
  const selectedUser = users.find((item) => String(item.id) === String(selectedId)) || null;
  const assignedQuery = useQuery(userLocationsOptions(selectedUser?.id));
  const [locationRoles, setLocationRoles] = useState({});
  const [feedback, setFeedback] = useState(null);
  const queryClient = useQueryClient();
  const assignableRoles = createOptions?.roles || defaultAssignableRoles;

  useEffect(() => {
    if (!selectedUser) return;
    const timer = window.setTimeout(() => {
      setSelectedId(selectedUser.id);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [selectedUser, assignableRoles]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLocationRoles(Object.fromEntries((assignedQuery.data || []).map((item) => [
        String(item.location?.id ?? item.id),
        item.role || assignableRoles[0] || "",
      ])));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [assignedQuery.data, assignableRoles]);
  useEffect(() => {
    setFeedback(null);
  }, [selectedUser?.id]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const before = new Set((assignedQuery.data || []).map((item) => String(item.location?.id ?? item.id)));
      const after = new Set(Object.keys(locationRoles));
      await Promise.all([
        [...after].map((id) => grantUserLocation(selectedUser.id, id, locationRoles[id])),
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
  const toggleLocation = (id) => setLocationRoles((current) => {
    const key = String(id);
    if (current[key]) {
      const next = { ...current };
      delete next[key];
      return next;
    }
    return { ...current, [key]: assignableRoles[0] || "" };
  });
  const visibleUsers = users.filter((item) => `${item.name || item.fullName || item.username || ""} ${item.phone || item.email || ""}`.toLowerCase().includes(userSearch.trim().toLowerCase()));
  const visibleLocations = locations;
  const userName = (item) => item?.name || item?.fullName || item?.username || item?.email || "Unnamed user";
  const userSecondary = (item) => item?.phone || item?.phoneNumber || item?.email || "";

  return <Shell title="Access Management" description="Manage each user's role and authorized operating locations." showLocationContext={false}>
    <div className="grid gap-5 lg:grid-cols-[minmax(18rem,.8fr)_minmax(0,1.2fr)]">
      <section className="rounded-[16px] border border-[var(--cc-border)] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <label className="mb-4 block text-[11px] font-bold uppercase tracking-[0.06em] text-[#77716D]">Location
          <select aria-label="Filter users by location" className="mt-2 h-11 w-full rounded-[10px] border border-[var(--cc-border)] bg-white px-3 text-sm font-semibold normal-case tracking-normal text-[var(--cc-text)]" value={locationFilter} onChange={(event) => { setLocationFilter(event.target.value); setSelectedId(null); setFeedback(null); }}>
            <option value="ALL">All locations</option>
            {locations.map((location) => <option key={location.id} value={String(location.id)}>{location.name || location.title || `Location ${location.id}`}</option>)}
          </select>
        </label>
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
        {selectedUser && !loading && <div className="space-y-5"><div><p className="text-base font-semibold text-[var(--cc-text)]">{selectedUser.name || selectedUser.fullName || selectedUser.username || selectedUser.email}</p><p className="mt-1 text-xs text-[var(--cc-secondary-text)]">Current access</p><div className="mt-2 flex flex-wrap gap-2">{(assignedQuery.data || []).map((item) => { const location = item.location || item; return <span key={location.id} className="inline-flex items-center gap-1.5 rounded-full bg-[var(--cc-primary-light)] px-2.5 py-1 text-xs font-semibold text-[var(--cc-primary-dark)]"><MapPin className="size-3" />{location.name || location.title || `Location ${location.id}`}: {humanRole(item.role)}</span>; })}{!(assignedQuery.data || []).length && <span className="text-xs text-[var(--cc-muted-text)]">No active location access</span>}</div></div>
          <fieldset><legend className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#77716D]">Location Access and Role</legend><div className="mt-2 space-y-2">{visibleLocations.map((location) => { const key = String(location.id); const assigned = Boolean(locationRoles[key]); return <div key={location.id} className={`flex min-h-11 items-center gap-3 rounded-[10px] border px-3 text-sm ${assigned ? "border-[var(--cc-primary)] bg-[var(--cc-primary-light)]" : "border-[var(--cc-border)]"}`}><input type="checkbox" className="size-4 accent-[var(--cc-primary)]" checked={assigned} onChange={() => toggleLocation(location.id)} /><span className="min-w-0 flex-1 truncate">{location.name || location.title || `Location ${location.id}`}</span>{assigned && <select aria-label={`Role at ${location.name}`} className="h-9 rounded-[8px] border border-[var(--cc-border)] bg-white px-2 text-xs" value={locationRoles[key]} onChange={(event) => setLocationRoles((current) => ({ ...current, [key]: event.target.value }))}>{assignableRoles.map((value) => <option key={value} value={value}>{humanRole(value)}</option>)}</select>}</div>; })}</div></fieldset>
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

// Payments tab — payment availability is stored independently for each location.
export function ControlCenterPayments() {
  const queryClient = useQueryClient();
  const { activeLocation } = useActiveLocation();
  const { data: locations = [], isLoading: locationsLoading } = useQuery(adminLocationsOptions());
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const locationId = selectedLocationId || (Number.isFinite(Number(activeLocation?.id)) ? String(activeLocation.id) : String(locations[0]?.id || ""));
  const { data: settings, isLoading: settingsLoading, error: settingsError } = useQuery({
    queryKey: ["admin", "settings", locationId],
    enabled: Boolean(locationId),
    queryFn: () => getAdminSettings(locationId),
  });
  const payAtStall = settings?.payAtStallEnabled ?? false;
  const toggle = (method, enabled) => adminSetPaymentMethod(method, locationId, enabled);

  const toggleMutation = useMutation({
    mutationFn: ({ method, enabled }) => toggle(method, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "settings", locationId] });
      queryClient.invalidateQueries({ queryKey: paymentConfigOptions.queryKey });
    },
  });

  return <Shell title="Payment Management" description="Configure available customer payment methods.">
    <div className="flex items-center gap-3 rounded-[16px] border border-[var(--cc-border)] bg-white p-4">
      <MapPin className="size-4 shrink-0 text-[var(--cc-primary)]" aria-hidden="true" />
      <label className="flex min-w-0 flex-1 items-center gap-3 text-sm font-semibold text-[var(--cc-text)]">
        <span className="shrink-0">Location</span>
        <select className="h-10 min-w-0 flex-1 rounded-[10px] border border-[var(--cc-border)] bg-white px-3 text-sm" value={locationId} onChange={(event) => setSelectedLocationId(event.target.value)} disabled={locationsLoading}>
          {locations.map((location) => <option key={location.id} value={String(location.id)}>{location.name || location.title || `Location ${location.id}`}</option>)}
        </select>
      </label>
    </div>
    <Card className="rounded-[16px] border-[var(--cc-border)] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      <CardHeader className="border-b border-[var(--cc-divider)] py-4"><CardTitle className="text-[15px] font-semibold text-[var(--cc-text)]">Payment methods</CardTitle></CardHeader>
      <CardContent className="p-0">
        <PaymentMethodRow
          icon={Wallet}
          title="Valid Balance (Wallet)"
          description="Customer wallet balance payments"
          enabled={settingsLoading ? null : settings?.walletEnabled}
          loading={settingsLoading}
          onToggle={() => toggleMutation.mutate({ method: "wallet", enabled: !settings?.walletEnabled })}
        />
        <PaymentMethodRow
          icon={IndianRupee}
          title="Razorpay"
          description="Card, UPI & netbanking via Razorpay"
          enabled={settingsLoading ? null : settings?.razorpayEnabled}
          loading={settingsLoading}
          onToggle={() => toggleMutation.mutate({ method: "razorpay", enabled: !settings?.razorpayEnabled })}
        />
        <PaymentMethodRow
          icon={MapPin}
          title="Pay at Stall"
          description="Order now, settle the bill at the counter"
          enabled={settingsLoading ? null : payAtStall}
          loading={toggleMutation.isPending}
          onToggle={() => toggleMutation.mutate({ method: "pay-at-stall", enabled: !payAtStall })}
        />
      </CardContent>
    </Card>
    <ErrorState error={settingsError || toggleMutation.error} />
  </Shell>;
}
