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
import { Link, useNavigate, useResolvedPath } from "react-router-dom";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { ButtonGroup } from "../ui/button-group";
import {
  BowlFoodIcon,
  KanbanIcon,
  QueueIcon,
  SignOutIcon,
  SquaresFourIcon,
  TagIcon,
} from "@phosphor-icons/react";
import { useAuth } from "@/context/AuthContext";

export function AdminSidebar() {
  const { setUser: setAdmin } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useResolvedPath();

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
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel>Orders</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                className="text-zinc-700 font-medium"
                isActive={pathname === "/admin/service-board"}
                render={
                  <Link to={"/admin/service-board"}>
                    <KanbanIcon
                      className="text-primary"
                      weight={
                        pathname === "/admin/service-board" ? "bold" : "regular"
                      }
                    />
                    <span>Service Board</span>
                  </Link>
                }
              />
            </SidebarMenuItem>
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
                    <span>Operational Queue</span>
                  </Link>
                }
              />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel>Coupons</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                className="text-zinc-700 font-medium"
                isActive={pathname === "/admin/coupons"}
                render={
                  <Link to={"/admin/coupons"}>
                    <TagIcon
                      className="text-primary"
                      weight={
                        pathname === "/admin/coupons" ? "bold" : "regular"
                      }
                    />
                    <span>Coupons</span>
                  </Link>
                }
              />
            </SidebarMenuItem>
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
                      navigate("/login");
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
