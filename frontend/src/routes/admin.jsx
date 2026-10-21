import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { AdminSidebar, AdminLocationSelector } from "@/components/admin/AdminSidebar";
import { SidebarInset, SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { AdminDashboardProvider } from "@/context/AdminDashboardContext";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon, CaretRightIcon, SidebarIcon } from "@phosphor-icons/react";
import { RoleGuard } from "@/components/RoleGuard";
import { CAN_ACCESS_ADMIN, canAccessAdmin } from "@/lib/roles";
import { ADMIN_NAVIGATION } from "@/lib/adminNavigation";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({ component: AdminLayout });

const SECTION_LABELS = { Menu: "Menu Management", Offers: "Marketing", Analytics: "Reports" };

function findNavTrail(pathname) {
  let best = null;
  for (const group of ADMIN_NAVIGATION) {
    for (const item of group.items) {
      const matches = pathname === item.to || (item.to !== "/admin" && pathname.startsWith(item.to));
      if (matches && (!best || item.to.length > best.to.length)) best = { ...item, section: group.section };
    }
  }
  return best;
}

function SubPageHeader({ title, showBack = false }) {
  const { toggleSidebar } = useSidebar();
  return (
      <header className={cn("admin-workspace-header sticky top-0 z-30 flex h-14 shrink-0 items-center border-b bg-white/90 px-3 backdrop-blur-xl sm:px-5 md:h-[68px]", !title && "md:hidden")}>
        <div className="flex w-full min-w-0 items-center gap-2.5">
          {showBack && <Button type="button" size="icon" variant="ghost" onClick={() => window.history.back()} aria-label="Go back" className="size-10 shrink-0 rounded-xl"><ArrowLeftIcon weight="bold" /></Button>}
          <Button type="button" size="icon" variant="ghost" onClick={toggleSidebar} aria-label="Toggle navigation" className="size-10 shrink-0 rounded-xl text-stone-600 hover:bg-stone-100"><SidebarIcon size={21} /></Button>
          {title && <h1 className="min-w-0 flex-1 truncate text-[15px] font-bold tracking-tight text-stone-900 sm:text-lg">{title}</h1>}
        </div>
      </header>
  );
}

function AdminLayoutContent() {
  const { pathname } = useLocation();
  const { setOpenMobile } = useSidebar();
  useEffect(() => { setOpenMobile(false); }, [pathname, setOpenMobile]);
  const isDashboard = pathname === "/admin" || pathname === "/admin/";
  const isControlCenterHome = pathname === "/admin/control-center" || pathname === "/admin/control-center/";
  const isInvoiceManagement = pathname.startsWith("/admin/control-center/invoice-management");
  const isMrpProduct = pathname.startsWith("/admin/mrp-product") || pathname.startsWith("/admin/global-products");
  const isKitchenQueue = pathname.startsWith("/admin/kitchen-queue");
  const isFoodCourt = pathname.startsWith("/admin/food-court");
  const hideGenericHeader = isDashboard || isControlCenterHome || isMrpProduct;
  const pageTitle = isKitchenQueue ? "Kitchen Queue" : isFoodCourt ? "Food Court Management" : undefined;
  const { user } = useAuth();
  const showTopBar = canAccessAdmin(user) && !isDashboard && !isControlCenterHome && !isInvoiceManagement && !pageTitle;
  const trail = showTopBar ? findNavTrail(pathname) : null;
  return (
      <>
        <AdminSidebar />
        <SidebarInset className={cn("admin-workspace flex min-h-svh min-w-0 flex-1 flex-col overflow-x-clip bg-[#f7f5f2]")}>
          {showTopBar && (
            <header className="max-md:hidden sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-6 border-b border-stone-200/80 bg-white/90 px-6 backdrop-blur-xl">
              <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-sm">
                {trail && (
                  <>
                    <span className="truncate text-stone-500">{SECTION_LABELS[trail.section] ?? trail.section}</span>
                    <CaretRightIcon size={12} className="shrink-0 text-stone-400" aria-hidden="true" />
                    <span className="truncate font-semibold text-stone-900">{trail.label}</span>
                  </>
                )}
              </nav>
              <div className="w-64 shrink-0">
                <AdminLocationSelector variant="flat" />
              </div>
            </header>
          )}
          {!hideGenericHeader && <SubPageHeader title={pageTitle} />}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col"><Outlet /></div>
        </SidebarInset>
      </>
  );
}

function AdminLayout() {
  return <RoleGuard roles={CAN_ACCESS_ADMIN}><AdminDashboardProvider><SidebarProvider style={{ "--sidebar-width": "17.25rem", "--sidebar-width-icon": "4.25rem" }}><AdminLayoutContent /></SidebarProvider></AdminDashboardProvider></RoleGuard>;
}
