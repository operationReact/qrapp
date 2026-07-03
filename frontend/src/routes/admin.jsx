import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import {
  SidebarInset,
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar";
import { AdminDashboardProvider, useAdminDashboard } from "@/context/AdminDashboardContext";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarIcon } from "@phosphor-icons/react";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

// ── Compact sub-page header (hamburger left, bell right) ──────────────────────
function SubPageHeader() {
  const { toggleSidebar } = useSidebar();
  const { dashboard } = useAdminDashboard();
  const notifCount = Math.min(
    (dashboard?.delayedOrders ?? 0) + (dashboard?.placedOrders ?? 0),
    9,
  );

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-zinc-100/80">
      <div className="flex items-center justify-between px-3 h-12">
        {/* hamburger */}
        <Button
          size="icon"
          variant="ghost"
          onClick={toggleSidebar}
          aria-label="Open menu"
          className="shrink-0"
        >
          <SidebarIcon />
        </Button>

        {/* bell — only shows badge when there are real alerts */}
        <Button
          aria-label="Notifications"
          size="icon"
          variant="ghost"
          className="relative shrink-0"
        >
          <Bell className="size-[18px]" />
          {notifCount > 0 && (
            <span className="absolute top-1 right-1 size-[14px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none tabular-nums">
              {notifCount}
            </span>
          )}
        </Button>
      </div>
    </header>
  );
}

function AdminLayout() {
  const { pathname } = useLocation();
  // Dashboard has its own embedded premium header — skip the layout header there
  const isDashboard = pathname === "/admin" || pathname === "/admin/";

  return (
    <AdminDashboardProvider>
      <SidebarProvider>
        <AdminSidebar />
        <SidebarInset>
          {!isDashboard && <SubPageHeader />}
          <div className="flex-1 flex flex-col">
            <Outlet />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </AdminDashboardProvider>
  );
}
