import "@/styles/admin-sidebar-compact.css";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { useAdminDashboard } from "@/context/AdminDashboardContext";
import { Link, useNavigate, useLocation } from "@tanstack/react-router";
import { SignOutIcon, TerminalWindowIcon, ArrowsClockwiseIcon, SidebarIcon } from "@phosphor-icons/react";
import { ChevronDown, Check, Globe2, MapPin, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLocation as useActiveLocation } from "@/context/LocationContext";
import { cn } from "@/lib/utils";
import { canAccessAdmin, hasRole } from "@/lib/roles";
import { ADMIN_NAVIGATION } from "@/lib/adminNavigation";
import { GeneratedAvatar } from "@/components/ui/generated-avatar";
import { ALL_LOCATIONS } from "@/lib/allLocations";
import { useEffect, useId, useRef, useState } from "react";

const SECTION_LABELS = { Menu: "Menu Management", Offers: "Marketing", Analytics: "Reports" };

function getActiveNavPath(pathname, navPaths) {
  const path = pathname.replace(/\/$/, "") || "/";
  return navPaths.filter(to => path === to || (to !== "/admin" && path.startsWith(to + "/")))
    .sort((a, b) => b.length - a.length)[0];
}

function NavItem({ to, label, icon: Icon = TerminalWindowIcon, active, alertCount, onNavigate }) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton tooltip={label} isActive={active} aria-current={active ? "page" : undefined}
        aria-label={label} className="bb-nav-link"
        render={<Link to={to} onClick={onNavigate}>
          <Icon weight={active ? "fill" : "regular"} className="bb-nav-icon" aria-hidden="true" />
          <span className="bb-nav-text">{label}</span>
          {label === "Kitchen Queue" && alertCount > 0 && <span className="bb-nav-badge" aria-label={alertCount + " pending orders"}>{alertCount > 9 ? "9+" : alertCount}</span>}
        </Link>} />
    </SidebarMenuItem>
  );
}

export function AdminLocationSelector({ variant = "card" }) {
  const { activeLocation, availableLocations, setActiveLocation, isAllLocations, isLoading, allLocationsOption, canSelectAllLocations } = useActiveLocation();
  const [open, setOpen] = useState(false);
  const popoverRef = useRef(null);
  const triggerRef = useRef(null);
  const listId = useId();
  const locationName = isAllLocations ? "All Locations" : activeLocation?.name || activeLocation?.title || "Select location";
  useEffect(() => {
    if (!open) return;
    const closeOnPointerDown = event => { if (!popoverRef.current?.contains(event.target)) setOpen(false); };
    const closeOnEscape = event => {
      if (event.key === "Escape") {
        event.stopPropagation();
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", closeOnPointerDown);
    // Close the location list before the surrounding mobile drawer.
    document.addEventListener("keydown", closeOnEscape, true);
    return () => {
      document.removeEventListener("pointerdown", closeOnPointerDown);
      document.removeEventListener("keydown", closeOnEscape, true);
    };
  }, [open]);
  const select = location => {
    setActiveLocation(location);
    setOpen(false);
    triggerRef.current?.focus();
  };
  if (isLoading) return <div className="bb-location-loading" role="status">Loading locations…</div>;
  return (
    <div ref={popoverRef} className={cn("bb-location-control", variant === "flat" && "bb-location-flat")}>
      <button ref={triggerRef} type="button" className="bb-location-trigger" title={locationName}
        onClick={() => setOpen(current => !current)} aria-label={`Select location, currently ${locationName}`} aria-expanded={open} aria-controls={open ? listId : undefined}>
        {isAllLocations ? <Globe2 aria-hidden="true" /> : <MapPin aria-hidden="true" />}
        <span className="bb-location-name">{locationName}</span>
        <ChevronDown className={cn("bb-location-chevron", open && "rotate-180")} aria-hidden="true" />
      </button>
      {open && <div id={listId} role="group" aria-label="Available locations" className="bb-location-options">
        {canSelectAllLocations && <button type="button" aria-pressed={isAllLocations} onClick={() => select(allLocationsOption || ALL_LOCATIONS)}>
          <Globe2 aria-hidden="true" /><span>All Locations</span>{isAllLocations && <Check aria-hidden="true" />}
        </button>}
        {availableLocations.map(location => {
          const name = location.name || location.title || `Location ${location.id}`;
          const selected = !isAllLocations && String(activeLocation?.id) === String(location.id);
          return <button key={location.id} type="button" aria-pressed={selected} onClick={() => select(location)} title={name}>
            <MapPin aria-hidden="true" /><span>{name}</span>{selected && <Check aria-hidden="true" />}
          </button>;
        })}
        {!availableLocations.length && !canSelectAllLocations && <p className="bb-location-empty">No locations available</p>}
      </div>}
    </div>
  );
}

export function AdminSidebar() {
  const { setUser: setAdmin, user } = useAuth();
  const { activeLocationId } = useActiveLocation();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { setOpenMobile, toggleSidebar, state, isMobile } = useSidebar();
  const { refreshing, loadData, dashboard, dashboardLoading, dashboardRefreshing, dashboardUpdatedAt, dashboardError, error } = useAdminDashboard();
  const alertCount = (dashboard?.delayedOrders ?? 0) + (dashboard?.placedOrders ?? 0);
  const userName = user?.info?.name || user?.name || user?.username || "Admin";
  const isSuperAdmin = Boolean(user?.isSuperUser || hasRole(user, "SUPER_ADMIN", activeLocationId));
  const roleLabel = isSuperAdmin ? "Super Admin" : hasRole(user, "MANAGER", activeLocationId) ? "Manager" : hasRole(user, "KITCHEN_STAFF", activeLocationId) ? "Kitchen Staff" : "Admin";
  const avatar = user?.info?.avatarUrl || user?.avatarUrl || user?.profilePicture;
  const avatarSeed = user?.info?.id ?? user?.id ?? user?.info?.email ?? user?.email ?? userName;
  const closeMobile = () => setOpenMobile(false);
  const [openSections, setOpenSections] = useState({});
  const visibleGroups = ADMIN_NAVIGATION.map(group => ({ ...group, items: group.items.filter(item => hasRole(user, item.roles, activeLocationId)) })).filter(group => group.items.length);
  const activeNavPath = getActiveNavPath(pathname, visibleGroups.flatMap(group => group.items.map(item => item.to)));
  const collapsed = !isMobile && state === "collapsed";
  const updating = refreshing || dashboardLoading || dashboardRefreshing;
  const syncFailed = Boolean(error || dashboardError);
  const syncLabel = updating ? "Updating…" : syncFailed ? "Sync unavailable" : dashboardUpdatedAt ? "Connected" : "Sync idle";
  const syncState = updating ? "busy" : syncFailed ? "error" : dashboardUpdatedAt ? "ready" : "idle";
  useEffect(() => {
    const section = ADMIN_NAVIGATION.find(group => group.items.some(item => item.to === activeNavPath))?.section;
    if (section) setOpenSections(current => current[section] === true ? current : { ...current, [section]: true });
  }, [activeNavPath]);

  const renderItem = item => <NavItem key={item.to} {...item} active={item.to === activeNavPath} alertCount={alertCount} onNavigate={closeMobile} />;

  return (
    <Sidebar collapsible="icon" mobileWidth="min(320px, calc(100vw - 24px))" className="bb-compact-admin-sidebar">
      <SidebarHeader className="bb-admin-header">
        <div className="bb-admin-brand">
          <Link to="/admin" className="bb-admin-brand-link" onClick={closeMobile} aria-label="Bro & Bro Admin Console">
            <img src="/bro-logo.png" alt="" /><span>Admin Console</span>
          </Link>
          <button type="button" className="bb-admin-icon-button md:hidden" onClick={closeMobile} aria-label="Close admin menu"><X aria-hidden="true" /></button>
          <button type="button" className="bb-admin-icon-button hidden md:grid" onClick={toggleSidebar} aria-label="Collapse or expand navigation" title="Collapse or expand navigation"><SidebarIcon aria-hidden="true" /></button>
        </div>
        <div className="bb-admin-profile md:hidden">
          <div className="bb-admin-avatar">{avatar ? <img src={avatar} alt="" /> : <GeneratedAvatar seed={avatarSeed} size={40} className="size-full" />}</div>
          <div className="bb-admin-identity"><p title={userName}>{userName}</p><span>{roleLabel}</span></div>
        </div>
        <div className="md:hidden">{canAccessAdmin(user) && <AdminLocationSelector />}</div>
      </SidebarHeader>

      <nav aria-label="Admin navigation" className="bb-admin-nav">
        <SidebarContent className="bb-admin-nav-scroll">
          {visibleGroups.map(({ section, items, icon: SectionIcon }) => {
            const containsActive = items.some(item => item.to === activeNavPath);
            const isOpen = collapsed || (openSections[section] ?? containsActive);
            const label = SECTION_LABELS[section] || section;
            const sectionId = "bb-nav-" + section.toLowerCase().replace(/[^a-z0-9]+/g, "-");
            return <div key={section} className="bb-nav-group">
              {items.length > 1 && !collapsed && <button type="button" className="bb-nav-section" aria-expanded={isOpen} aria-controls={sectionId}
                onClick={() => setOpenSections(current => ({ ...current, [section]: !isOpen }))}>
                {SectionIcon && <SectionIcon className="bb-section-icon" aria-hidden="true" />}
                <span>{label}</span>
                {section === "Operations" && alertCount > 0 && <span className="bb-nav-badge">{alertCount > 9 ? "9+" : alertCount}</span>}
                <ChevronDown className={cn("bb-section-chevron", isOpen && "rotate-180")} aria-hidden="true" />
              </button>}
              <SidebarMenu id={sectionId} hidden={items.length > 1 && !isOpen} className="bb-nav-list">
                {(items.length === 1 || isOpen) && items.map(renderItem)}
              </SidebarMenu>
            </div>;
          })}
        </SidebarContent>
      </nav>

      <SidebarFooter className="bb-admin-footer">
        <div className="bb-admin-sync">
          <span className="bb-sync-label" role="status"><span className="bb-sync-dot" data-state={syncState} />{syncLabel}</span>
          <button type="button" className="bb-admin-icon-button" onClick={() => loadData({ quiet: true })} disabled={updating} aria-label="Refresh data" title={syncLabel}>
            <ArrowsClockwiseIcon className={cn(updating && "motion-safe:animate-spin")} aria-hidden="true" />
          </button>
        </div>
        <SidebarMenu className="bb-nav-list">
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Sign Out" className="bb-nav-link" aria-label="Sign Out" render={<button type="button" onClick={() => { setAdmin(null); navigate({ to: "/login" }); closeMobile(); }}>
              <SignOutIcon className="bb-nav-icon" aria-hidden="true" /><span className="bb-nav-text">Sign Out</span>
            </button>} />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
