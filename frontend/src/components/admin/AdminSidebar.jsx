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
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { ButtonGroup } from "../ui/button-group";
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
} from "@phosphor-icons/react";
import { useAuth } from "@/context/AuthContext";

export function AdminSidebar() {
  const { setUser: setAdmin } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const { refreshing, loadData } = useAdminDashboard();

  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="data-[slot=sidebar-menu-button]:p-1.5! h-auto hover:bg-unset"
              render={
                <Link
                  to="/admin"
                  className="flex gap-2 items-center font-semibold"
                >
                  <img
                    src="/bro-logo.png"
                    alt="Bro and Bro Admin"
                    className="size-10!"
                  />
                </Link>
              }
            />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="Dashboard"
                className="text-sm! font-medium! text-zinc-700"
                isActive={pathname === "/admin"}
                render={
                  <Link to="/admin">
                    <SquaresFourIcon
                      className="text-primary"
                      weight={pathname === "/admin" ? "bold" : "regular"}
                    />
                    <span>Dashboard</span>
                  </Link>
                }
              />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                className="text-zinc-700 font-medium"
                isActive={pathname === "/admin/menu"}
                render={
                  <Link to={"/admin/menu"}>
                    <BowlFoodIcon
                      className="text-primary"
                      weight={pathname === "/admin/menu" ? "bold" : "regular"}
                    />
                    <span>Menu</span>
                  </Link>
                }
              />
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                className="text-zinc-700 font-medium"
                isActive={pathname === "/admin/combos"}
                render={
                  <Link to={"/admin/combos"}>
                    <CubeIcon
                      className="text-primary"
                      weight={pathname === "/admin/combos" ? "bold" : "regular"}
                    />
                    <span>Combos</span>
                  </Link>
                }
              />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel>Orders</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                className="text-zinc-700 font-medium"
                isActive={pathname.startsWith("/admin/operational-queue")}
                render={
                  <Link to={"/admin/operational-queue"}>
                    <QueueIcon
                      className="text-primary"
                      weight={
                        pathname.startsWith("/admin/operational-queue")
                          ? "bold"
                          : "regular"
                      }
                    />
                    <span>Kitchen Queue</span>
                  </Link>
                }
              />
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                className="text-zinc-700 font-medium"
                isActive={pathname === "/admin/party-orders"}
                render={
                  <Link to={"/admin/party-orders"}>
                    <UsersThreeIcon
                      className="text-primary"
                      weight={
                        pathname === "/admin/party-orders" ? "bold" : "regular"
                      }
                    />
                    <span>Party Orders</span>
                  </Link>
                }
              />
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                className="text-zinc-700 font-medium"
                isActive={pathname === "/admin/pre-orders"}
                render={
                  <Link to={"/admin/pre-orders"}>
                    <CalendarCheckIcon
                      className="text-primary"
                      weight={pathname === "/admin/pre-orders" ? "bold" : "regular"}
                    />
                    <span>Pre-Orders</span>
                  </Link>
                }
              />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup className="group-data-[collapsible=icon]:hidden">

          <SidebarGroupLabel>Offers</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                className="text-zinc-700 font-medium"
                isActive={pathname === "/admin/promotions"}
                render={
                  <Link to={"/admin/promotions"}>
                    <TicketIcon
                      className="text-primary"
                      weight={pathname === "/admin/promotions" ? "bold" : "regular"}
                    />
                    <span>Promotions</span>
                  </Link>
                }
              />
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                className="text-zinc-700 font-medium"
                isActive={pathname === "/admin/milestones"}
                render={
                  <Link to={"/admin/milestones"}>
                    <TrophyIcon
                      className="text-primary"
                      weight={pathname === "/admin/milestones" ? "bold" : "regular"}
                    />
                    <span>Milestones</span>
                  </Link>
                }
              />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel>Growth Tools</SidebarGroupLabel>
          <SidebarMenu>
            {[
              { to: "/admin/recommendations",  label: "Recommendations",  icon: ListPlusIcon },
              { to: "/admin/auto-suggestions", label: "Auto Suggestions",  icon: MagicWandIcon },
              { to: "/admin/upsell-rules",     label: "Upsell Rules",      icon: LightningIcon },
              { to: "/admin/category-pairings",label: "Category Pairings", icon: ArrowsOutSimpleIcon },
            ].map(({ to, label, icon }) => {
              const ItemIcon = icon;
              return (
                <SidebarMenuItem key={to}>
                  <SidebarMenuButton
                    className="text-zinc-700 font-medium"
                    isActive={pathname === to}
                    render={
                      <Link to={to}>
                        <ItemIcon
                          className="text-primary"
                          weight={pathname === to ? "bold" : "regular"}
                        />
                        <span>{label}</span>
                      </Link>
                    }
                  />
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel>Global Controls</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                className="text-zinc-700 font-medium"
                isActive={pathname === "/admin/global-controls"}
                render={
                  <Link to={"/admin/global-controls"}>
                    <SlidersIcon
                      className="text-primary"
                      weight={pathname === "/admin/global-controls" ? "bold" : "regular"}
                    />
                    <span>Settings</span>
                  </Link>
                }
              />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel>Analytics</SidebarGroupLabel>
          <SidebarMenu>
            {[
              { to: "/admin/analytics", label: "Overview", icon: ChartLineUpIcon },
              { to: "/admin/analytics/sales", label: "Sales", icon: ChartBarIcon },
              { to: "/admin/analytics/orders", label: "Orders", icon: ShoppingCartSimpleIcon },
              { to: "/admin/analytics/menu", label: "Menu", icon: ForkKnifeIcon },
              { to: "/admin/analytics/users", label: "Users", icon: UserCircleIcon },
              { to: "/admin/analytics/coupons", label: "Promotions", icon: TicketIcon },
              { to: "/admin/analytics/recommendations", label: "Recommendations", icon: StarIcon },
            ].map(({ to, label, icon }) => {
              const ItemIcon = icon;
              return (
              <SidebarMenuItem key={to}>
                <SidebarMenuButton
                  className="text-zinc-700 font-medium"
                  isActive={pathname === to}
                  render={
                    <Link to={to}>
                      <ItemIcon
                        className="text-primary"
                        weight={pathname === to ? "bold" : "regular"}
                      />
                      <span>{label}</span>
                    </Link>
                  }
                />
              </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarGroup>
            <SidebarMenuItem className="mb-2">
              <ButtonGroup>
                <Badge className=" bg-zinc-100 h-7 justify-start w-full">
                  <div
                    className={`size-2 rounded-full animate-pulse ${refreshing ? "bg-amber-500" : "bg-emerald-500"}`}
                  />
                  <span className="text-xs font-medium text-slate-600">
                    {refreshing ? "Updating..." : "Live Sync"}
                  </span>
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadData({ quiet: true })}
                  disabled={refreshing}
                  className="font-medium! text-sm!"
                >
                  Refresh
                </Button>
              </ButtonGroup>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                className="text-sm! font-medium! text-zinc-700"
                render={
                  <button
                    onClick={() => {
                      setAdmin(null);
                      navigate({ to: "/login" });
                    }}
                  >
                    <SignOutIcon /> Logout
                  </button>
                }
              />
            </SidebarMenuItem>
          </SidebarGroup>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
