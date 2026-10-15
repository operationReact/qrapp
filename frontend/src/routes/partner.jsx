import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import {
  BarChart3,
  Bell,
  Building2,
  ChevronDown,
  ClipboardList,
  FileBarChart,
  FileText,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu as MenuIcon,
  MoreHorizontal,
  Package,
  ScrollText,
  ShieldCheck,
  UserRound,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { PartnerRouteGuard } from "@/components/PartnerRouteGuard";
import { NotificationBell } from "@/components/partner/PartnerNotificationBell";
import { ExecutiveOverview } from "@/components/partner/PartnerReportsComponents";
import { PartnerProvider, usePartner } from "@/context/PartnerContext";
import { useAuth } from "@/context/AuthContext";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  getPartnerDisplayName,
  getPartnerGreeting,
  getPartnerLogoUrl,
  getTimeUntilNextGreetingBoundary,
} from "@/lib/partnerBranding";

export const Route = createFileRoute("/partner")({ component: PartnerLayout });

const primaryNavigation = [
  { to: "/partner", label: "Overview", icon: LayoutDashboard },
  { to: "/partner/performance", label: "Performance", icon: BarChart3 },
    { to: "/partner/reports", label: "Reports", icon: FileBarChart },
    { to: "/partner/insights", label: "Employee insights", icon: Users },
  { to: "/partner/feedback", label: "Feedback & complaints", icon: ClipboardList },
];

const financeNavigation = [
  { to: "/partner/finance", label: "Finance overview", icon: Wallet },
  { to: "/partner/finance/settlements", label: "Settlements", icon: FileText, prefix: true },
  { to: "/partner/finance/agreements", label: "Agreements", icon: ScrollText, prefix: true },
];

const operationsNavigation = [
  { to: "/partner/orders", label: "Orders", icon: ClipboardList },
  { to: "/partner/menu", label: "Menu", icon: MenuIcon },
  { to: "/partner/locations", label: "Locations", icon: MapPin },
  { to: "/partner/users", label: "Users", icon: Users },
];

const accountNavigation = [{ to: "/partner/profile", label: "Profile", icon: UserRound }];

function PartnerLayout() {
  return (
    <PartnerRouteGuard>
      <PartnerProvider>
        <PartnerShell />
      </PartnerProvider>
    </PartnerRouteGuard>
  );
}

function PartnerShell() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const portal = usePartner();
  const [moreOpen, setMoreOpen] = useState(false);
  const partner = portal.portal?.partner;
  const partnerDisplayName = getPartnerDisplayName(partner);
  const logout = () => {
    setUser(null);
    navigate({ to: "/login" });
  };
  const active = (path, prefix = false) => {
    const current = pathname.replace(/\/+$/, "") || "/";
    return prefix ? current === path || current.startsWith(`${path}/`) : current === path;
  };

  if (portal.isLoading) return <PortalLoading />;
  if (portal.isError || !partner) {
    return <div className="partner-portal-error">Unable to load Partner Portal.</div>;
  }

  return (
    <div className="partner-portal">
      <aside className="partner-sidebar">
        <div className="partner-sidebar-brand">
          <div className="partner-sidebar-logos">
            <img src="/bro-logo.png" alt="Bro & Bro" className="partner-bro-logo" />
            <span className="partner-sidebar-divider" aria-hidden="true" />
            {getPartnerLogo(partner) && (
              <img src={getPartnerLogo(partner)} alt={`${partnerDisplayName} logo`} className="partner-sidebar-partner-logo" />
            )}
          </div>
          <span className="partner-sidebar-brand-label">Partner workspace</span>
        </div>
        <div className="partner-sidebar-scroll">
          <SidebarGroup label="Workspace" items={primaryNavigation} active={active} />
          <SidebarGroup label="Finance" items={financeNavigation} active={active} />
          <SidebarGroup label="Operations" items={operationsNavigation} active={active} />
          <SidebarGroup
            label="Account"
            items={accountNavigation}
            active={active}
            action={{ label: "Log out", icon: LogOut, onClick: logout }}
          />
        </div>
        <div className="partner-sidebar-footer">
          <ShieldCheck className="size-4" />
          <span>Secure partner workspace</span>
        </div>
      </aside>

      <div className="partner-main">
        <header className="partner-header">
          <PartnerHeaderBranding
            key={partner.id || partner.partnerCode}
            name={partnerDisplayName}
            logo={getPartnerLogo(partner)}
          />
          <div className="partner-header-actions">
            <PartnerLocationSelector />
            <NotificationBell />
            <span className="partner-status"><span />{partner.status}</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className="partner-profile-button" aria-label="Open partner account menu">
                  <UserRound className="size-4" />
                  <span>Profile</span>
                  <ChevronDown className="size-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate({ to: "/partner/profile" })}>
                  <UserRound className="size-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onClick={logout}>
                  <LogOut className="size-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="partner-content">
          <Outlet />
        </main>
      </div>

      <nav className="partner-mobile-nav" aria-label="Partner navigation">
        <MobileNavLink to="/partner" label="Overview" icon={LayoutDashboard} active={active("/partner")} />
        <MobileNavLink to="/partner/performance" label="Performance" icon={BarChart3} active={active("/partner/performance")} />
        <MobileNavLink to="/partner/reports" label="Reports" icon={FileBarChart} active={active("/partner/reports")} />
        <button
          type="button"
          className={`partner-mobile-nav-item ${moreOpen ? "is-active" : ""}`}
          onClick={() => setMoreOpen((value) => !value)}
          aria-expanded={moreOpen}
        >
          {moreOpen ? <X className="size-5" /> : <MoreHorizontal className="size-5" />}
          <span>More</span>
        </button>
      </nav>

      {moreOpen && (
        <div className="partner-mobile-more">
          <div className="partner-mobile-more-head"><span>Workspace</span><button type="button" onClick={() => setMoreOpen(false)} aria-label="Close menu"><X className="size-4" /></button></div>
          <MobileMoreLink to="/partner/notifications" label="Notifications" icon={Bell} onClick={() => setMoreOpen(false)} />
          <MobileMoreLink to="/partner/orders" label="Orders" icon={ClipboardList} onClick={() => setMoreOpen(false)} />
          <MobileMoreLink to="/partner/menu" label="Menu" icon={MenuIcon} onClick={() => setMoreOpen(false)} />
          <MobileMoreLink to="/partner/locations" label="Locations" icon={MapPin} onClick={() => setMoreOpen(false)} />
          <MobileMoreLink to="/partner/users" label="Users" icon={Users} onClick={() => setMoreOpen(false)} />
          <MobileMoreLink to="/partner/insights" label="Employee insights" icon={Users} onClick={() => setMoreOpen(false)} />
          <MobileMoreLink to="/partner/feedback" label="Feedback & complaints" icon={ClipboardList} onClick={() => setMoreOpen(false)} />
          <MobileMoreLink to="/partner/profile" label="Profile" icon={UserRound} onClick={() => setMoreOpen(false)} />
          <button type="button" className="partner-mobile-more-link partner-mobile-more-logout" onClick={logout}>
            <LogOut className="size-4" />
            <span>Log out</span>
          </button>
          <MobileMoreLink to="/partner/finance" label="Finance overview" icon={Wallet} onClick={() => setMoreOpen(false)} />
          <MobileMoreLink to="/partner/finance/settlements" label="Settlements & statements" icon={FileText} onClick={() => setMoreOpen(false)} />
          <MobileMoreLink to="/partner/finance/agreements" label="Commission agreements" icon={ScrollText} onClick={() => setMoreOpen(false)} />
        </div>
      )}
    </div>
  );
}

function PartnerHeaderBranding({ name, logo }) {
  return (
    <div className="partner-header-brand partner-header-branding-group">
      <div className="partner-header-logo-surface">
        <div className="partner-header-branding-logos">
          <span className="partner-header-logo-frame">
            <img src="/bro-logo.png" alt="Bro & Bro" className="partner-header-bro-logo" />
          </span>
          <span className="partner-sidebar-divider" aria-hidden="true" />
          <span className="partner-header-logo-frame">
            {logo && <img src={logo} alt={`${name} logo`} className="partner-header-partner-logo" />}
          </span>
        </div>
      </div>
      <div className="partner-header-partner-name"><strong>{name}</strong></div>
    </div>
  );
}

function SidebarGroup({ label, items, active, action }) {
  return (
    <section className="partner-sidebar-group">
      <p className="partner-sidebar-label">{label}</p>
      {items.map((item) => {
        const Icon = item.icon;
        if (item.soon) return <div key={item.label} className="partner-sidebar-link is-disabled"><Icon className="size-[17px]" /><span>{item.label}</span><em>Soon</em></div>;
        return <Link key={item.to} to={item.to} className={`partner-sidebar-link ${active(item.to, item.prefix) ? "is-active" : ""}`}><Icon className="size-[17px]" /><span>{item.label}</span></Link>;
      })}
      {action && (() => {
        const ActionIcon = action.icon;
        return (
        <button type="button" className="partner-sidebar-link partner-sidebar-logout" onClick={action.onClick}>
          <ActionIcon className="size-[17px]" />
          <span>{action.label}</span>
        </button>
        );
      })()}
    </section>
  );
}

function MobileNavLink({ to, label, icon, active, soon }) {
  const Icon = icon;
  if (soon) return <div className="partner-mobile-nav-item is-disabled"><Icon className="size-5" /><span>{label}</span></div>;
  return <Link to={to} className={`partner-mobile-nav-item ${active ? "is-active" : ""}`}><Icon className="size-5" /><span>{label}</span></Link>;
}

function MobileMoreLink({ to, label, icon, onClick }) {
  const Icon = icon;
  return <Link to={to} className="partner-mobile-more-link" onClick={onClick}><Icon className="size-4" /><span>{label}</span><ChevronDown className="ml-auto size-3 -rotate-90 opacity-40" /></Link>;
}

function PartnerLocationSelector() {
  const { locations, selectedLocationId, setSelectedLocationId } = usePartner();
  const selected = locations.find((location) => String(location.locationId) === String(selectedLocationId));
  return <DropdownMenu><DropdownMenuTrigger asChild><button type="button" className="partner-location-control" aria-label="Select Partner location"><MapPin className="size-4" /><span>{selected?.locationName || "Select location"}</span><ChevronDown className="size-4" /></button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-[min(18rem,calc(100vw-1rem))]">{locations.map((location) => <DropdownMenuItem key={location.locationId} onClick={() => setSelectedLocationId(String(location.locationId))}>{location.locationName}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu>;
}

export function PartnerDashboard({ dashboard }) {
  const { portal, locations } = usePartner();
  const partner = portal.partner;
  const greeting = usePartnerGreeting();
  const metrics = [
    { label: "Locations", value: dashboard.activeLocations, detail: "Active locations", icon: MapPin, tone: "red" },
    { label: "Users", value: dashboard.activeUsers, detail: "Active users", icon: Users, tone: "gold" },
    { label: "Primary", value: dashboard.primaryLocations, detail: "Primary location", icon: Building2, tone: "blue" },
    { label: "Status", value: dashboard.partner.status, detail: "Partner status", icon: ShieldCheck, tone: "green" },
  ];
  return (
    <div className="partner-dashboard">
      <section className="partner-page-intro">
        <div>
          <p className="partner-eyebrow">Workspace overview</p>
          <h1>{greeting}, {getPartnerDisplayName(partner)}</h1>
          <p>Here&apos;s your workplace food experience at a glance.</p>
        </div>
        <span className="partner-date-note">Live workspace snapshot</span>
      </section>
      <section className="partner-metric-grid" aria-label="Partner metrics">
        {metrics.map((metric) => <PartnerMetricCard key={metric.label} {...metric} />)}
      </section>
      <section className="partner-dashboard-grid">
        <ExecutiveOverview />
        <section className="partner-section-card">
          <SectionHeader eyebrow="Your footprint" title="Locations" action={{ to: "/partner/locations", label: "View all" }} />
          <div className="partner-location-list">
            {locations.slice(0, 3).map((location) => <PartnerLocationCard key={location.id} location={location} />)}
            {!locations.length && <PartnerEmptyState icon={MapPin} title="No locations assigned" description="Assigned locations will appear here." compact />}
          </div>
        </section>
      </section>
    </div>
  );
}

function usePartnerGreeting() {
  const [greeting, setGreeting] = useState(() => getPartnerGreeting());

  useEffect(() => {
    let timeoutId;

    const scheduleUpdate = () => {
      timeoutId = window.setTimeout(updateGreeting, getTimeUntilNextGreetingBoundary());
    };
    const updateGreeting = () => {
      window.clearTimeout(timeoutId);
      setGreeting((current) => {
        const next = getPartnerGreeting();
        return current === next ? current : next;
      });
      scheduleUpdate();
    };

    scheduleUpdate();
    window.addEventListener("focus", updateGreeting);
    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener("focus", updateGreeting);
    };
  }, []);

  return greeting;
}

export function PartnerMetricCard({ label, value, detail, icon, tone = "red" }) {
  const Icon = icon;
  return <article className={`partner-metric-card tone-${tone}`}><div className="partner-metric-icon"><Icon className="size-[17px]" /></div><div className="partner-metric-copy"><p>{label}</p><strong>{value ?? "--"}</strong><span>{detail}</span></div></article>;
}

export function SectionHeader({ eyebrow, title, action }) {
  return <div className="partner-section-header"><div><p className="partner-eyebrow">{eyebrow}</p><h2>{title}</h2></div>{action && <Link to={action.to} className="partner-section-action">{action.label}<ChevronDown className="size-3 -rotate-90" /></Link>}</div>;
}

export function PartnerLocationCard({ location }) {
  return <Link to="/partner/locations/$locationId" params={{ locationId: String(location.locationId) }} className="partner-location-card"><div className="partner-location-card-top"><div className="partner-location-pin"><MapPin className="size-4" /></div><div><h3>{location.locationName}</h3><p>{location.locationCode}</p></div><ChevronDown className="ml-auto size-4 -rotate-90 opacity-40" /></div><div className="partner-location-tags"><span>{location.relationshipType}</span><span className="is-active">{location.status}</span></div></Link>;
}

export function PartnerEmptyState({ icon, eyebrow, title, description, compact = false }) {
  const Icon = icon;
  return <div className={`partner-empty-state ${compact ? "is-compact" : ""}`}><div className="partner-empty-icon"><Icon className="size-5" /></div>{eyebrow && <p className="partner-eyebrow">{eyebrow}</p>}<h2>{title}</h2><p>{description}</p></div>;
}

function PortalLoading() {
  return <div className="partner-portal-loading"><div className="partner-loading-mark"><Building2 className="size-5" /></div><p>Loading your partner workspace…</p></div>;
}

function getPartnerLogo(partner) {
  return getPartnerLogoUrl(partner);
}
