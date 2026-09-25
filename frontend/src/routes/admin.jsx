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
    <header className="sticky top-0 z-40 border-b border-[var(--cc-divider)] bg-white">
      <div className="flex h-14 items-center justify-between px-4 md:h-16 md:px-6">
        {/* hamburger */}
        <Button
          size="icon"
          variant="ghost"
          onClick={toggleSidebar}
          aria-label="Open menu"
          className="size-11 shrink-0 rounded-[10px] text-[var(--cc-text)] hover:bg-[var(--cc-primary-light)]"
        >
          <SidebarIcon />
        </Button>

        {/* bell — only shows badge when there are real alerts */}
        <Button
          aria-label="Notifications"
          size="icon"
          variant="ghost"
          className="relative size-11 shrink-0 rounded-[10px] text-[var(--cc-text)] hover:bg-[var(--cc-primary-light)]"
        >
          <Bell className="size-[18px]" />
          {notifCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex size-4 items-center justify-center rounded-full bg-[var(--cc-primary)] text-[9px] font-bold leading-none text-white">
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
  // Control Center renders its own compact 64px header (menu + title + bell)
  // so it doesn't stack with this generic sub-page header.
  const isControlCenter = pathname.startsWith("/admin/control-center");
  const hideGenericHeader = isDashboard || isControlCenter;

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
            <SidebarInset className="min-w-0 bg-[var(--cc-page)]">
              {!hideGenericHeader && <SubPageHeader />}
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
