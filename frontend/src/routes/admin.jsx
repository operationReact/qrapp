import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import {
  SidebarInset,
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar";
import { AdminDashboardProvider } from "@/context/AdminDashboardContext";
import { Bell, Menu as MenuIcon } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

// ── Compact sub-page header (hamburger left, bell right) ──────────────────────
function SubPageHeader() {
  const { toggleSidebar } = useSidebar();
  const [notifCount] = useState(3);

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-zinc-100 shadow-[0_1px_3px_rgba(0,0,0,.04)]">
      <div className="flex items-center justify-between px-3.5 h-12 max-w-lg mx-auto">
        {/* hamburger */}
        <button
          onClick={toggleSidebar}
          aria-label="Open menu"
          className="size-8 flex items-center justify-center rounded-lg hover:bg-zinc-100 transition-colors -ml-1"
        >
          <MenuIcon size={18} className="text-zinc-700" />
        </button>

        {/* bell */}
        <button
          aria-label="Notifications"
          className="size-8 flex items-center justify-center rounded-lg hover:bg-zinc-100 transition-colors relative -mr-1"
        >
          <Bell size={18} className="text-zinc-700" />
          {notifCount > 0 && (
            <span className="absolute top-0.5 right-0.5 size-3.5 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center leading-none">
              {notifCount}
            </span>
          )}
        </button>
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
