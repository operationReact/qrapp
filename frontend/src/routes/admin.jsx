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
import { RoleGuard } from "@/components/RoleGuard";
import { CAN_ACCESS_ADMIN } from "@/lib/roles";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

// ── Compact sub-page header (hamburger left, optional centered title, bell right) ──
// Reused across all admin sub-pages. Pages that need a visible page title (e.g.
// Kitchen Queue) pass `title`; pages that render their own in-body title keep it blank.
function SubPageHeader({ title }) {
  const { toggleSidebar } = useSidebar();
  const { dashboard } = useAdminDashboard();
  const notifCount = Math.min(
    (dashboard?.delayedOrders ?? 0) + (dashboard?.placedOrders ?? 0),
    9,
  );

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--cc-divider)] bg-white">
      <div className={cn("flex h-14 items-center px-4 md:h-16 md:px-6", title ? "justify-between gap-2" : "justify-between")}>
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

        {title && (
          <h1 className="min-w-0 flex-1 truncate text-center text-[16px] font-bold leading-6 text-[var(--cc-text)] md:text-[18px]">
            {title}
          </h1>
        )}

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
  // Dashboard has its own embedded premium header — skip the layout header there
  const isDashboard = pathname === "/admin" || pathname === "/admin/";
  // Control Center renders its own compact 64px header (menu + title + bell)
  // so it doesn't stack with this generic sub-page header.
  const isControlCenter = pathname.startsWith("/admin/control-center");
  const isPartners = pathname === "/admin/partners";
  const isKitchenQueue = pathname.startsWith("/admin/kitchen-queue");
  const isFoodCourt = pathname.startsWith("/admin/food-court");
  const isProductCatalog = pathname.startsWith("/admin/product-catalog");
  const hideGenericHeader = isDashboard || isControlCenter || isPartners;

  return (
    <RoleGuard roles={CAN_ACCESS_ADMIN}>
      <AdminDashboardProvider>
        <SidebarProvider>
          <AdminSidebar />
          <SidebarInset className="min-w-0 bg-[var(--cc-page)]">
            {!hideGenericHeader && <SubPageHeader
              title={isKitchenQueue ? "Kitchen Queue" : isFoodCourt ? "Food Court Management" : isProductCatalog ? "Essentials Catalog" : undefined}
            />}
            <div className="min-h-0 flex-1 flex flex-col">
              <Outlet />
            </div>
          </SidebarInset>
        </SidebarProvider>
      </AdminDashboardProvider>
    </RoleGuard>
  );
}
