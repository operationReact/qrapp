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
} from "@phosphor-icons/react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { hasRole } from "@/lib/roles";
import { ADMIN_NAVIGATION } from "@/lib/adminNavigation";

// Helper: generates consistent SidebarMenuButton props
function NavItem({ to, label, icon, pathname }) {
  const Icon = icon;
  const active = pathname === to || (to !== "/admin" && pathname.startsWith(to));
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        className={cn(
          "h-10! rounded-xl! text-sm! font-medium! transition-all",
          active
            ? "bg-primary/10! text-primary! shadow-[inset_3px_0_0_var(--primary)]"
            : "text-zinc-600! hover:bg-white/80! hover:text-zinc-950!",
        )}
        isActive={active}
        render={
          <Link to={to}>
            <Icon weight={active ? "bold" : "regular"} className={active ? "text-primary" : "text-zinc-500"} />
            <span>{label}</span>
          </Link>
        }
      />
    </SidebarMenuItem>
  );
}

export function AdminSidebar() {
  const { setUser: setAdmin, user } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { refreshing, loadData, dashboard } = useAdminDashboard();

  const alertCount = (dashboard?.delayedOrders ?? 0) + (dashboard?.placedOrders ?? 0);

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border/60 px-3 py-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="h-auto! rounded-2xl! p-2! hover:bg-white/70!"
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

      <SidebarContent className="gap-1 px-3 py-4">
        {ADMIN_NAVIGATION.map(({ section, items }) => {
          const visibleItems = items.filter((item) => hasRole(user, item.roles));
          if (!visibleItems.length) return null;
          return <SidebarGroup key={section} className="border-b border-zinc-200/60 p-0 pb-3">
            <SidebarGroupLabel className="mb-1 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400">{section}{section === "Operations" && alertCount > 0 && <span className="ml-auto">{alertCount > 9 ? "9+" : alertCount}</span>}</SidebarGroupLabel>
            <SidebarMenu>{visibleItems.map(({ to, label, icon }) => <NavItem key={to} to={to} label={label} icon={icon || TerminalWindowIcon} pathname={pathname === "/admin" && to === "/admin" ? "/admin" : pathname} />)}</SidebarMenu>
          </SidebarGroup>;
        })}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/60 px-3 py-4">
        <SidebarMenu>
          {/* Live sync status */}
          <SidebarMenuItem>
            <div className="mb-2 flex items-center gap-2 rounded-2xl border border-emerald-100 bg-white/80 px-3 py-2.5 shadow-sm">
              <span className={cn(
                "size-2 rounded-full shrink-0",
                refreshing ? "bg-amber-400 animate-pulse" : "bg-emerald-500 animate-pulse",
              )} />
              <span className="flex-1 text-xs font-medium text-zinc-600 truncate">
                {refreshing ? "Updating…" : "Live Sync"}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="size-6 shrink-0"
                onClick={() => loadData({ quiet: true })}
                disabled={refreshing}
                aria-label="Refresh data"
              >
                <ArrowsClockwiseIcon className={cn("size-3.5 text-zinc-500", refreshing && "animate-spin")} />
              </Button>
            </div>
          </SidebarMenuItem>

          {/* Logout */}
          <SidebarMenuItem>
            <SidebarMenuButton
              className="h-10! rounded-xl! text-sm! font-medium! text-zinc-600! hover:bg-red-50! hover:text-red-600!"
              render={
                <button
                  onClick={() => {
                    setAdmin(null);
                    navigate({ to: "/login" });
                  }}
                >
                  <SignOutIcon className="text-zinc-500" />
                  <span>Sign Out</span>
                </button>
              }
            />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
