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
  BowlFoodIcon,
  QueueIcon,
  SignOutIcon,
  SquaresFourIcon,
  UsersThreeIcon,
  ChartLineUpIcon,
  ChartBarIcon,
  ShoppingCartSimpleIcon,
  ForkKnifeIcon,
  UserCircleIcon,
  TicketIcon,
  StarIcon,
  CubeIcon,
  TrophyIcon,
  CalendarCheckIcon,
  SlidersIcon,
  LightningIcon,
  ArrowsOutSimpleIcon,
  MagicWandIcon,
  ListPlusIcon,
  SparkleIcon,
  CurrencyInrIcon,
  TerminalWindowIcon,
  ArrowsClockwiseIcon,
} from "@phosphor-icons/react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

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
  const { setUser: setAdmin } = useAuth();
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

        {/* Dashboard */}
        <SidebarGroup className="p-0 pb-3">
          <SidebarMenu>
            <NavItem to="/admin" label="Dashboard" icon={SquaresFourIcon} pathname={pathname === "/admin" || pathname === "/admin/" ? "/admin" : ""} />
          </SidebarMenu>
        </SidebarGroup>

        {/* Menu */}
        <SidebarGroup className="border-t border-zinc-200/60 p-0 pt-3 group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel className="mb-1 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400">
            Menu
          </SidebarGroupLabel>
          <SidebarMenu>
            <NavItem to="/admin/menu" label="Menu Items" icon={BowlFoodIcon} pathname={pathname} />
            <NavItem to="/admin/combos" label="Combos" icon={CubeIcon} pathname={pathname} />
            <NavItem to="/admin/combo-campaigns" label="BYOC Campaigns" icon={SparkleIcon} pathname={pathname} />
            <NavItem to="/admin/classification" label="Recommendation Setup" icon={ForkKnifeIcon} pathname={pathname} />
          </SidebarMenu>
        </SidebarGroup>

        {/* Orders */}
        <SidebarGroup className="p-0 group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel className="mb-1 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400">
            Orders
            {alertCount > 0 && (
              <span className="ml-auto inline-flex items-center justify-center size-4 rounded-full bg-red-500 text-white text-[9px] font-bold">
                {alertCount > 9 ? "9+" : alertCount}
              </span>
            )}
          </SidebarGroupLabel>
          <SidebarMenu>
            <NavItem to="/admin/operational-queue" label="Kitchen Queue" icon={QueueIcon} pathname={pathname} />
            <NavItem to="/admin/party-orders" label="Party Orders" icon={UsersThreeIcon} pathname={pathname} />
            <NavItem to="/admin/pre-orders" label="Pre-Orders" icon={CalendarCheckIcon} pathname={pathname} />
          </SidebarMenu>
        </SidebarGroup>

        {/* Offers */}
        <SidebarGroup className="p-0 group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel className="mb-1 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400">
            Offers
          </SidebarGroupLabel>
          <SidebarMenu>
            <NavItem to="/admin/promotions" label="Promotions" icon={TicketIcon} pathname={pathname} />
            <NavItem to="/admin/milestones" label="Milestones" icon={TrophyIcon} pathname={pathname} />
          </SidebarMenu>
        </SidebarGroup>

        {/* Growth */}
        <SidebarGroup className="p-0 group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel className="mb-1 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400">
            Growth Tools
          </SidebarGroupLabel>
          <SidebarMenu>
            {[
              { to: "/admin/item-recommendations",  label: "Item Pairings",       icon: ListPlusIcon },
              { to: "/admin/auto-suggestions",      label: "Auto Suggestions",    icon: MagicWandIcon },
              { to: "/admin/upsell-rules",          label: "Upsell Rules",        icon: LightningIcon },
              { to: "/admin/category-pairings",     label: "Category Pairings",   icon: ArrowsOutSimpleIcon },
              { to: "/admin/combo-opportunities",   label: "Combo Opportunities", icon: SparkleIcon },
              { to: "/admin/analytics/profitability", label: "Profitability",     icon: CurrencyInrIcon },
            ].map(({ to, label, icon }) => (
              <NavItem key={to} to={to} label={label} icon={icon} pathname={pathname} />
            ))}
          </SidebarMenu>
        </SidebarGroup>

        {/* Settings */}
        <SidebarGroup className="p-0 group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel className="mb-1 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400">
            System
          </SidebarGroupLabel>
          <SidebarMenu>
            <NavItem to="/admin/global-controls" label="Settings" icon={SlidersIcon} pathname={pathname} />
            <NavItem to="/admin/ops-center" label="Operations Center" icon={TerminalWindowIcon} pathname={pathname} />
          </SidebarMenu>
        </SidebarGroup>

        {/* Analytics */}
        <SidebarGroup className="p-0 group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel className="text-[10px] uppercase tracking-widest font-semibold text-zinc-400 px-2 py-1.5 mb-0.5">
            Analytics
          </SidebarGroupLabel>
          <SidebarMenu>
            {[
              { to: "/admin/analytics",              label: "Overview",         icon: ChartLineUpIcon },
              { to: "/admin/analytics/sales",        label: "Sales",            icon: ChartBarIcon },
              { to: "/admin/analytics/orders",       label: "Orders",           icon: ShoppingCartSimpleIcon },
              { to: "/admin/analytics/menu",         label: "Menu",             icon: ForkKnifeIcon },
              { to: "/admin/analytics/users",        label: "Users",            icon: UserCircleIcon },
              { to: "/admin/analytics/coupons",      label: "Promotions",       icon: TicketIcon },
              { to: "/admin/analytics/recommendations", label: "Recommendations", icon: StarIcon },
            ].map(({ to, label, icon }) => (
              <NavItem key={to} to={to} label={label} icon={icon} pathname={pathname} />
            ))}
          </SidebarMenu>
        </SidebarGroup>

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
