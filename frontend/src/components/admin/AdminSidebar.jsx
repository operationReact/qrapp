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
import { Dashboard, FoodMenu } from "@boxicons/react";
import { Boxes, CakeSlice, FolderKanban, LogOutIcon } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

export function AdminSidebar() {
  const { setAdmin } = useAdminAuth();
  const navigate = useNavigate();
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
                {/* <span className="font-semibold uppercase text-xs tracking-widest text-zinc-700">Admin Panel</span> */}
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
              >
                <Link to="/admin">
                  <Dashboard />
                  <span>Dashboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* <SidebarMenuItem className="flex items-center gap-2"> */}
            {/*   <SidebarMenuButton */}
            {/*     tooltip="Quick Create" */}
            {/*     className="min-w-8 text-sm! rounded-lg font-medium! border border-primary-foreground bg-linear-to-br from-primary/20 to-primary/5 text-primary duration-200 ease-linear hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground" */}
            {/*   > */}
            {/*     <PlusCircle pack="filled" /> */}
            {/*     <span>Create Menu</span> */}
            {/*   </SidebarMenuButton> */}
            {/* </SidebarMenuItem> */}
          </SidebarMenu>
        </SidebarGroup>
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild className="text-zinc-700 font-medium">
                <Link to={"/admin/menu"}>
                  <CakeSlice />
                  <span>Menu</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton asChild className="text-zinc-700 font-medium">
                <Link to={"/admin/manage-menu"}>
                  <FoodMenu />
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
              <SidebarMenuButton asChild className="text-zinc-700 font-medium">
                <Link to={"/admin/service-board"}>
                  <FolderKanban />
                  <span>Service Board</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild className="text-zinc-700 font-medium">
                <Link to={"/admin/operational-queue"}>
                  <Boxes />
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
