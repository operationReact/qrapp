import "@/styles/admin-profile-card.css";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useAdminDashboard } from "@/context/AdminDashboardContext";
import { Link, useNavigate, useLocation } from "@tanstack/react-router";
import { Button } from "../ui/button";
import {
  SignOutIcon,
  TerminalWindowIcon,
  ArrowsClockwiseIcon,
  CrownIcon,
  SidebarIcon,
} from "@phosphor-icons/react";
import {
  ChevronDown,
  Check,
  Globe2,
  MapPin,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLocation as useActiveLocation } from "@/context/LocationContext";
import { cn } from "@/lib/utils";
import { canAccessAdmin, hasRole } from "@/lib/roles";
import { ADMIN_NAVIGATION } from "@/lib/adminNavigation";
import { GeneratedAvatar } from "@/components/ui/generated-avatar";
import { useSidebar } from "@/components/ui/sidebar";
import { ALL_LOCATIONS } from "@/lib/allLocations";
import { useEffect, useRef, useState } from "react";

function getActiveNavPath(pathname, navPaths) {
  const matches = navPaths.filter((to) => pathname === to || (to !== "/admin" && pathname.startsWith(to)));
  return matches.sort((a, b) => b.length - a.length)[0];
}

function NavItem({ to, label, icon, active, alertCount, onNavigate }) {
  const Icon = icon;
  return (
      <SidebarMenuItem>
        <SidebarMenuButton
            className={cn(
                "h-11! rounded-xl! px-3! text-[15px]! font-medium! transition-all md:h-10! md:text-sm!",
                active
                    ? "bg-[#f6efe6]! text-[#29231e]! shadow-[inset_3px_0_0_#29231e]"
                    : "text-[#29231e]! hover:bg-white/80! hover:text-zinc-950!",
            )}
            isActive={active}
            aria-current={active ? "page" : undefined}
            render={
              <Link to={to} className="min-h-11 gap-2.5 md:min-h-0 md:gap-2" onClick={onNavigate}>
                {/* "bold" weight (vs. the library's thin "regular" default) gives the
                icons stronger visual presence to match the mockup; "fill" on the
                active item reinforces where the user is. */}
                <Icon weight={active ? "fill" : "bold"} className={cn("size-[22px] shrink-0 md:size-[20px]", active ? "text-[#29231e]" : "text-[#4a4038]")} />
                <span>{label}</span>
                {label === "Kitchen Queue" && alertCount > 0 && <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-[#e51b23] px-1.5 text-[10px] font-bold leading-5 text-white">{alertCount > 9 ? "9+" : alertCount}</span>}
                {label !== "Dashboard" && label !== "Kitchen Queue" && <span className="ml-auto text-[#756e66]">›</span>}
              </Link>
            }

        />
      </SidebarMenuItem>
  );
}

export function AdminLocationSelector({ variant = "card" }) {
  const flat = variant === "flat";
  const {
    activeLocation,
    availableLocations,
    setActiveLocation,
    isAllLocations,
    isLoading,
    allLocationsOption,
  } = useActiveLocation();
  const [open, setOpen] = useState(false);
  const popoverRef = useRef(null);
  const locationName = isAllLocations
      ? "All Locations"
      : activeLocation?.name || activeLocation?.title || "Location";

  useEffect(() => {
    if (!open) return undefined;
    const closeOnPointerDown = (event) => {
      if (!popoverRef.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnPointerDown);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnPointerDown);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  if (isLoading) {
    return <div className="h-11 w-full animate-pulse rounded-xl bg-[#f3e7d3]" aria-label="Loading locations" />;
  }

  return (
      <div ref={popoverRef} className="relative min-w-0 w-full">
        <button
            type="button"
            className={flat
                ? "flex h-10 w-full min-w-0 items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 text-left text-stone-900 shadow-sm transition-colors hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-300"
                : "flex min-h-11 w-full min-w-0 items-center gap-2.5 rounded-xl border px-3 py-1.5 text-left text-[#211b18] transition-all hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd98a]/70"}
            style={flat ? undefined : { background: "linear-gradient(180deg, #fffdf9 0%, #fff3e3 100%)", borderColor: "rgba(255,217,138,0.9)", boxShadow: "0 6px 16px rgba(60,0,0,0.25), inset 0 1px 0 #ffffff" }}
            onClick={() => setOpen((current) => !current)}
            aria-label={`Select location, currently ${locationName}`}
            aria-expanded={open}
        >
        {!flat && <span className="grid size-8 shrink-0 place-items-center rounded-lg" style={{ background: "linear-gradient(135deg, #fff0ef, #ffe0dc)", color: "#e51b23" }}>
          {isAllLocations ? <Globe2 className="size-4" aria-hidden="true" /> : <MapPin className="size-4" aria-hidden="true" />}
        </span>}
          <span className="min-w-0 flex-1">
            <span className={cn("block text-[10px] font-bold uppercase tracking-[0.08em]", flat ? "text-stone-500" : "text-[#b88746]")}>Location</span>
            <span className={cn("block truncate text-sm font-semibold tracking-[-0.01em]", flat && "text-stone-900")} style={flat ? undefined : { color: "#211b18" }}>{locationName}</span>
          </span>
          <span className={cn("grid size-6 shrink-0 place-items-center rounded-full transition-transform", open && "rotate-180", flat && "text-stone-500")} style={flat ? undefined : { background: "#fff0ef" }}>
            <ChevronDown className="size-3.5" style={flat ? undefined : { color: "#e51b23" }} aria-hidden="true" />
          </span>
        </button>
        {open && (
            <div className="absolute inset-x-0 top-[calc(100%+8px)] z-30 overflow-hidden rounded-2xl p-1.5" style={flat ? { background: "#fff", border: "1px solid #e7e5e4", boxShadow: "0 12px 30px rgba(28,25,23,0.12)" } : { background: "#fffdf9", border: "1px solid #ecd9bf", boxShadow: "0 18px 45px rgba(60,0,0,0.30)" }}>
              <button
                  type="button"
                  className="flex min-h-11 w-full items-center gap-2 rounded-xl px-2.5 text-left text-sm"
                  style={{ color: isAllLocations ? "#e51b23" : "#211b18", background: isAllLocations ? "#fff0ef" : "transparent", fontWeight: isAllLocations ? 600 : 400 }}
                  onClick={() => {
                    setActiveLocation(allLocationsOption || ALL_LOCATIONS);
                    setOpen(false);
                  }}
              >
                <Globe2 className="size-4 shrink-0" aria-hidden="true" />
                <span className="flex-1">All Locations</span>
                {isAllLocations && <Check className="size-4" aria-hidden="true" />}
              </button>
              {availableLocations.map((location) => {
                const name = location.name || location.title || `Location ${location.id}`;
                const selected = !isAllLocations && String(activeLocation?.id) === String(location.id);
                return (
                    <button
                        key={location.id}
                        type="button"
                        className="flex min-h-11 w-full items-center gap-2 rounded-xl px-2.5 text-left text-sm"
                        style={{ color: selected ? "#e51b23" : "#211b18", background: selected ? "#fff0ef" : "transparent", fontWeight: selected ? 600 : 400 }}
                        onClick={() => {
                          setActiveLocation(location);
                          setOpen(false);
                        }}
                    >
                      <MapPin className="size-4 shrink-0" aria-hidden="true" />
                      <span className="min-w-0 flex-1 break-words leading-5">{name}</span>
                      {selected && <Check className="size-4" aria-hidden="true" />}
                    </button>
                );
              })}
            </div>
        )}
      </div>
  );
}

export function AdminSidebar() {
  const { setUser: setAdmin, user } = useAuth();
  const { activeLocationId } = useActiveLocation();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { setOpenMobile, toggleSidebar } = useSidebar();
  const { refreshing, loadData, dashboard } = useAdminDashboard();
  const alertCount = (dashboard?.delayedOrders ?? 0) + (dashboard?.placedOrders ?? 0);
  const showLocationSelector = canAccessAdmin(user);
  const userName = user?.info?.name || user?.name || user?.username || "Admin";
  const isSuperAdmin = Boolean(user?.isSuperUser || hasRole(user, "SUPER_ADMIN", activeLocationId));
  const roleLabel = isSuperAdmin ? "Super Admin" : hasRole(user, "MANAGER", activeLocationId) ? "Manager" : hasRole(user, "KITCHEN_STAFF", activeLocationId) ? "Kitchen Staff" : "Admin";
  const avatar = user?.info?.avatarUrl || user?.avatarUrl || user?.profilePicture;
  // Deterministic, illustrated (non-initials, non-emoji) fallback avatar:
  // same user (by stable id/email/username) always renders with the same
  // warm-toned "bust" illustration, rather than a random or initials circle.
  const avatarSeed = user?.info?.id ?? user?.id ?? user?.info?.email ?? user?.email ?? userName;
  const closeMobile = () => setOpenMobile(false);
  const [openSections, setOpenSections] = useState({});
  const activeNavPath = getActiveNavPath(pathname, ADMIN_NAVIGATION.flatMap((group) => group.items.map((item) => item.to)));

  return (
      <>
      <Sidebar collapsible="icon" className="admin-sidebar-shell min-h-0 min-w-0 pt-[env(safe-area-inset-top)] md:pt-0">
        <SidebarHeader className="shrink-0 border-b border-sidebar-border/60 px-3 py-3 md:px-3 md:py-4">
          <div style={{ background: "linear-gradient(135deg, #e51b23 0%, #c4161d 52%, #7f0d13 100%)", borderColor: "rgba(255,217,138,0.45)", boxShadow: "0 16px 34px rgba(229,27,35,0.28), inset 0 1px 0 rgba(255,255,255,0.22)" }} className="bb-admin-profile-card flex flex-col gap-3 rounded-2xl border p-3.5 text-white md:hidden">
            <span aria-hidden="true" className="bb-admin-sheen" />
            <div className="flex min-w-0 items-center gap-3">
            <div className="bb-admin-avatar size-11 shrink-0 overflow-hidden rounded-full" style={{ border: "2px solid #ffd98a" }}>
              {avatar
                  ? <img src={avatar} alt="" className="size-full object-cover" />
                  : <GeneratedAvatar seed={avatarSeed} size={48} className="size-full" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold leading-tight text-white">{userName}</p>
              <p className="flex items-center gap-1 truncate text-[11px] font-semibold leading-tight text-[#ffe3a3]">
                {roleLabel}
                {isSuperAdmin && <CrownIcon weight="fill" className="bb-admin-crown size-[13px] shrink-0 text-[#ffd98a]" aria-hidden="true" />}
              </p>
            </div>
            <button type="button" onClick={closeMobile} aria-label="Close admin menu"             className="grid size-9 shrink-0 place-items-center rounded-xl text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd98a]/60">
              <X className="size-[18px]" aria-hidden="true" />
            </button>
            </div>
            {showLocationSelector && <AdminLocationSelector />}
          </div>

          {/* Desktop location control lives in the top bar of the admin layout (routes/admin.jsx). */}

          {/* Desktop collapse/expand control. Mobile uses the close button above. */}
          <div className="hidden justify-end px-1 pb-1 md:flex">
            <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                aria-label="Collapse or expand navigation"
                title="Collapse or expand navigation"
                className="size-9 rounded-xl text-[#756e66] hover:bg-[#f3e7d3] hover:text-[#29231e]"
            >
              <SidebarIcon className="size-[18px]" />
            </Button>
          </div>

          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                  className="hidden h-auto! rounded-2xl! p-2! hover:bg-white/70! md:flex"
                  render={
                    <Link to="/admin" className="flex gap-2.5 items-center">
                      <img src="/bro-logo.png" alt="Bro and Bro Admin" className="size-10! rounded-xl shadow-sm" />
                      <span className="text-sm font-bold leading-none tracking-tight text-foreground">
                    Bro & Bro<br />
                    <span className="mt-1 inline-block text-[10px] font-medium tracking-normal text-muted-foreground">Admin Console</span>
                  </span>
                    </Link>
                  }
              />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <nav aria-label="Admin navigation" className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <SidebarContent className="min-w-0 gap-0 overflow-y-auto overscroll-contain px-3 py-2 md:py-4">
            {ADMIN_NAVIGATION.map(({ section, items, icon }) => {
              const visibleItems = items.filter((item) => hasRole(user, item.roles, activeLocationId));
              if (!visibleItems.length) return null;
              const containsActive = visibleItems.some((item) => item.to === activeNavPath);
              const isOpen = openSections[section] ?? containsActive;
              const sectionLabel = section === "Menu" ? "Menu Management" : section === "Offers" ? "Marketing" : section === "Analytics" ? "Reports" : section;
              const SectionIcon = icon;
              return <SidebarGroup key={section} className="p-0 pt-1.5 pb-0 first:pt-0">
                <SidebarGroupLabel className="mb-0 p-0">
                  <button
                      type="button"
                      onClick={() => setOpenSections((current) => ({ ...current, [section]: !isOpen }))}
                      aria-expanded={isOpen}
                      className={cn(
                          "group flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd98a]/70",
                          isOpen ? "bg-[#fbf5ec]" : "hover:bg-[#fbf5ec]/70",
                      )}
                  >
                    <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[#f6efe6] text-[#29231e]">
                      {SectionIcon && <SectionIcon weight="duotone" className="size-4" aria-hidden="true" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-semibold tracking-[-0.01em] text-[#29231e]">{sectionLabel}</span>
                      <span className="block text-[11px] font-medium text-[#8a7f73]">{visibleItems.length} {visibleItems.length === 1 ? "page" : "pages"}</span>
                    </span>
                    {section === "Operations" && alertCount > 0 && <span className="rounded-full bg-[#e51b23] px-2 py-0.5 text-[11px] font-bold leading-none text-white">{alertCount > 9 ? "9+" : alertCount}</span>}
                    <ChevronDown className={cn("size-4 shrink-0 text-[#8a7f73] transition-transform duration-200", isOpen && "rotate-180 text-[#29231e]")} aria-hidden="true" />
                  </button>
                </SidebarGroupLabel>
                {isOpen && <SidebarMenu className="ml-[21px] mt-0.5 gap-0.5 border-l border-[#eadfd0] pb-1 pl-2">{visibleItems.map(({ to, label, icon }) => <NavItem key={to} to={to} label={label} icon={icon || TerminalWindowIcon} active={to === activeNavPath} alertCount={alertCount} onNavigate={closeMobile} />)}</SidebarMenu>}
              </SidebarGroup>;
            })}
          </SidebarContent>
        </nav>

        <SidebarFooter className="shrink-0 border-t border-sidebar-border/60 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 md:px-3 md:py-4">
          <SidebarMenu>
            <SidebarMenuItem>
              <div className="mb-1 flex min-h-11 items-center gap-2 rounded-xl border border-[#e7ded2] bg-[#fffdfc] px-3 py-2 shadow-[0_2px_8px_rgba(42,35,30,0.03)]">
              <span className={cn(
                  "size-2 rounded-full shrink-0",
                  refreshing ? "bg-amber-400 animate-pulse" : "bg-emerald-500 animate-pulse",
              )} />
                <span className="flex-1 truncate text-xs font-semibold text-[#29231e]">
                {refreshing ? "Updating…" : "Live Sync"} <span className="ml-1 font-medium text-[#16a34a]">Connected</span>
              </span>
                <Button
                    variant="ghost"
                    size="icon"
                    className="size-6 shrink-0"
                    onClick={() => loadData({ quiet: true })}
                    disabled={refreshing}
                    aria-label="Refresh data"
                >
                  <ArrowsClockwiseIcon className={cn("size-4 text-[#4a4038]", refreshing && "animate-spin")} />
                </Button>
              </div>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton
                  className="h-11! rounded-xl! text-[15px]! font-medium! text-[#29231e]! hover:bg-[#fff0f0]! hover:text-[#e51b23]!"
                  render={
                    <button
                        onClick={() => {
                          setAdmin(null);
                          navigate({ to: "/login" });
                          closeMobile();
                        }}
                    >
                      <SignOutIcon className="size-[20px] text-[#4a4038]" />
                      <span>Sign Out</span>
                    </button>
                  }
              />
            </SidebarMenuItem>
            <SidebarMenuItem className="hidden pt-2 md:block">
              <div className="flex items-center gap-2 px-2">
                <img src="/bro-logo.png" alt="Bro & Bro" className="size-9 rounded-lg object-contain" />
                <div>
                  <p className="text-xs font-bold text-[#29231e]">Bro & Bro</p>
                  <p className="text-[10px] text-[#756e66]">More Than Food. Greater Business.</p>
                </div>
              </div>
            </SidebarMenuItem>
            <SidebarMenuItem className="flex flex-col items-center gap-0.5 pt-2 md:hidden">
              <img src="/bro-logo.png" alt="Bro & Bro" className="h-9 w-9 rounded-lg object-contain" />
              <p className="text-xs font-bold text-[#29231e]">Bro & Bro</p>
              <p className="text-center text-[10px] leading-tight text-[#756e66]">More Than Food. Greater Business.</p>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      </>
  );
}
