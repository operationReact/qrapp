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
import { useAdminAuth } from "@/context/AdminAuthContext";
import { useAdminDashboard } from "@/context/AdminDashboardContext";
import { Dashboard, FoodMenu } from "@boxicons/react";
import { Boxes, CakeSlice, FolderKanban, LogOutIcon } from "lucide-react";
import { Link, useNavigate, useResolvedPath } from "react-router-dom";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { ButtonGroup } from "../ui/button-group";

export function AdminSidebar() {
  const { setAdmin } = useAdminAuth();
  const navigate = useNavigate();
  const { pathname } = useResolvedPath();

  const { refreshing, loadData } = useAdminDashboard();

  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5! h-auto hover:bg-unset"
            >
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
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip="Dashboard"
                className="text-sm! font-medium! text-zinc-700"
                isActive={pathname === "/admin"}
              >
                <Link to="/admin">
                  <Dashboard className="text-primary" />
                  <span>Dashboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                className="text-zinc-700 font-medium"
                isActive={pathname === "/admin/menu"}
              >
                <Link to={"/admin/menu"}>
                  <CakeSlice className="text-primary" />
                  <span>Menu</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                className="text-zinc-700 font-medium"
                isActive={pathname === "/admin/manage-menu"}
              >
                <Link to={"/admin/manage-menu"}>
                  <FoodMenu className="text-primary" />
                  <span>Manage Menu</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel>Orders</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                className="text-zinc-700 font-medium"
                isActive={pathname === "/admin/service-board"}
              >
                <Link to={"/admin/service-board"}>
                  <FolderKanban className="text-primary" />
                  <span>Service Board</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                className="text-zinc-700 font-medium"
                isActive={pathname.startsWith("/admin/operational-queue")}
              >
                <Link to={"/admin/operational-queue"}>
                  <Boxes className="text-primary" />
                  <span>Operational Queue</span>
                </Link>
              </SidebarMenuButton>
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
                asChild
                className="text-sm! font-medium! text-zinc-700"
              >
                <button
                  onClick={() => {
                    setAdmin(null);
                    navigate("/login");
                  }}
                >
                  <LogOutIcon /> Logout
                </button>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarGroup>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
