import { createFileRoute, Outlet, useLocation, Navigate } from "@tanstack/react-router";
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
import { RoleGuard } from "@/components/RoleGuard";
import { CAN_ACCESS_ADMIN, isKitchenStaffOnly } from "@/lib/roles";
import { useAuth } from "@/context/AuthContext";

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
    <header className="sticky top-0 z-40 border-b border-zinc-200/70 bg-background/90 backdrop-blur-xl">
      <div className="flex h-14 items-center justify-between px-3 md:px-6">
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
  const { user } = useAuth();
  // Dashboard has its own embedded premium header — skip the layout header there
  const isDashboard = pathname === "/admin" || pathname === "/admin/";

  // KITCHEN_STAFF are confined to the Kitchen Queue — bounce them there.
  const kitchenOnly = isKitchenStaffOnly(user);

  return (
    <RoleGuard roles={CAN_ACCESS_ADMIN}>
      {kitchenOnly && !pathname.startsWith("/admin/kitchen-queue") ? (
        <Navigate to="/admin/kitchen-queue" replace />
      ) : (
        <AdminDashboardProvider>
          <SidebarProvider>
            <AdminSidebar />
            <SidebarInset className="min-w-0 bg-[#f7f6f3]">
              {!isDashboard && <SubPageHeader />}
              <div className="min-h-0 flex-1 flex flex-col">
                <Outlet />
              </div>
            </SidebarInset>
          </SidebarProvider>
        </AdminDashboardProvider>
      )}
    </RoleGuard>
  );
}
