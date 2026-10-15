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
import { useEffect, useMemo, useRef, useState } from "react";

function NavItem({ to, label, icon, pathname, alertCount, onNavigate }) {
  const Icon = icon;
  const active = pathname === to || (to !== "/admin" && pathname.startsWith(to));
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        className={cn(
          "h-11! rounded-xl! px-3! text-[15px]! font-medium! transition-all md:h-10! md:text-sm!",
          active
            ? "bg-[#fff0f0]! text-[#e51b23]! shadow-[inset_3px_0_0_#e51b23]"
            : "text-[#29231e]! hover:bg-white/80! hover:text-zinc-950!",
        )}
        isActive={active}
        aria-current={active ? "page" : undefined}
        render={
          <Link to={to} className="min-h-11 gap-2.5 md:min-h-0 md:gap-2" onClick={onNavigate}>
            {/* "bold" weight (vs. the library's thin "regular" default) gives the
                icons stronger visual presence to match the mockup; "fill" on the
                active item reinforces where the user is. */}
            <Icon weight={active ? "fill" : "bold"} className={cn("size-[22px] shrink-0 md:size-[20px]", active ? "text-[#e51b23]" : "text-[#4a4038]")} />
            <span>{label}</span>
            {label === "Kitchen Queue" && alertCount > 0 && <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-[#e51b23] px-1.5 text-[10px] font-bold leading-5 text-white">{alertCount > 9 ? "9+" : alertCount}</span>}
            {label !== "Dashboard" && label !== "Kitchen Queue" && <span className="ml-auto text-[#756e66]">›</span>}
          </Link>
        }
      />
    </SidebarMenuItem>
  );
}

function MobileLocationSelector() {
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
    return <div className="h-10 w-24 shrink-0 animate-pulse rounded-xl bg-[#f3e7d3]" aria-label="Loading locations" />;
  }

  return (
    <div ref={popoverRef} className="relative shrink-0">
      <button
        type="button"
        className="flex h-10 w-[148px] min-[380px]:w-[160px] min-[420px]:w-[176px] items-center gap-2 rounded-full border border-[#dfd0c0] bg-gradient-to-b from-white to-[#fffaf4] px-3 text-left text-[#29231e] shadow-[0_3px_12px_rgba(78,55,35,0.10),inset_0_1px_0_rgba(255,255,255,0.9)] transition-all hover:-translate-y-px hover:border-[#cdb99f] hover:shadow-[0_5px_16px_rgba(78,55,35,0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e51b23]/30"
        onClick={() => setOpen((current) => !current)}
        aria-label={`Select location, currently ${locationName}`}
        aria-expanded={open}
      >
        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#fff0ed] text-[#e51b23]">
          {isAllLocations ? <Globe2 className="size-[13px]" aria-hidden="true" /> : <MapPin className="size-[13px]" aria-hidden="true" />}
        </span>
        <span className="min-w-0 flex-1 truncate text-[11px] font-semibold tracking-[-0.01em] text-[#29231e]">{locationName}</span>
        <ChevronDown className={cn("size-3.5 shrink-0 text-[#a58d78] transition-transform", open && "rotate-180 text-[#e51b23]")} aria-hidden="true" />
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-20 w-64 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-[#dfd0c0] bg-[#fffdfc]/95 p-1.5 shadow-[0_18px_45px_rgba(42,35,30,0.18)] backdrop-blur-xl">
          <button
            type="button"
            className={cn("flex min-h-11 w-full items-center gap-2 rounded-xl px-2.5 text-left text-sm", isAllLocations ? "bg-[#fff0f0] font-semibold text-[#e51b23]" : "text-[#29231e] hover:bg-[#f7f3ec]")}
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
                className={cn("flex min-h-11 w-full items-center gap-2 rounded-xl px-2.5 text-left text-sm", selected ? "bg-[#fff0f0] font-semibold text-[#e51b23]" : "text-[#29231e] hover:bg-[#f7f3ec]")}
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
  const { setOpenMobile } = useSidebar();
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

  // The "Control Center" nav item is SUPER_ADMIN-only and previously rendered
  // as its own emphasized "CONTROL" section above Workspace, which made it
  // dominate the sidebar. Fold it into Workspace so it reads as a normal
  // navigation item rather than a standalone hero section — no navigation
  // config duplication, just a render-time merge of the existing groups.
  const renderedNavigation = useMemo(() => {
    const controlGroup = ADMIN_NAVIGATION.find((group) => group.section === "Control");
    if (!controlGroup) return ADMIN_NAVIGATION;
    return ADMIN_NAVIGATION.filter((group) => group.section !== "Control").map((group) =>
      group.section === "Workspace"
        ? { ...group, items: [...group.items, ...controlGroup.items] }
        : group,
    );
  }, []);

  return (
    <Sidebar className="admin-sidebar-shell min-h-0 min-w-0 pt-[env(safe-area-inset-top)] md:pt-0">
      <SidebarHeader className="shrink-0 border-b border-sidebar-border/60 px-3 py-3 md:px-3 md:py-4">
        <div className="flex items-center gap-2 px-1 md:hidden">
          <div className="size-12 shrink-0 overflow-hidden rounded-full ring-1 ring-[#e7ded2]">
            {avatar
              ? <img src={avatar} alt="" className="size-full object-cover" />
              : <GeneratedAvatar seed={avatarSeed} size={48} className="size-full" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold leading-tight text-[#29231e]">{userName}</p>
            <p className="flex items-center gap-1 truncate text-[11px] font-medium leading-tight text-[#b88746]">
              {roleLabel}
              {isSuperAdmin && <CrownIcon weight="fill" className="size-[13px] shrink-0 text-[#b88746]" aria-hidden="true" />}
            </p>
          </div>
          {showLocationSelector && <MobileLocationSelector />}
          <button type="button" onClick={closeMobile} aria-label="Close admin menu" className="grid size-10 shrink-0 place-items-center rounded-xl text-[#29231e] transition-colors hover:bg-[#f3e7d3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e51b23]/30">
            <X className="size-[18px]" aria-hidden="true" />
          </button>
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
        {renderedNavigation.map(({ section, items }) => {
          const visibleItems = items.filter((item) => hasRole(user, item.roles, activeLocationId));
          if (!visibleItems.length) return null;
          return <SidebarGroup key={section} className="border-b border-[#e7ded2]/40 p-0 pt-3.5 pb-0 first:pt-0 last:border-0">
            <SidebarGroupLabel className="mb-1.5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#756e66]">{section === "Menu" ? "Menu Management" : section === "Offers" ? "Marketing" : section === "Analytics" ? "Reports" : section}{section === "Operations" && alertCount > 0 && <span className="ml-auto rounded-full bg-[#e51b23] px-1.5 text-[10px] leading-5 text-white">{alertCount > 9 ? "9+" : alertCount}</span>}</SidebarGroupLabel>
            <SidebarMenu className="gap-0.5">{visibleItems.map(({ to, label, icon }) => <NavItem key={to} to={to} label={label} icon={icon || TerminalWindowIcon} alertCount={alertCount} onNavigate={closeMobile} pathname={pathname === "/admin" && to === "/admin" ? "/admin" : pathname} />)}</SidebarMenu>
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
  );
}
