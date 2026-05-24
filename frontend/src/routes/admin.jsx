import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AdminDashboardProvider } from "@/context/AdminDashboardContext";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <AdminDashboardProvider>
      <SidebarProvider>
        <AdminSidebar />
        <SidebarInset>
          <div className="p-2 border-b w-full">
            <SidebarTrigger />
          </div>
          <div className="flex-1 flex flex-col">
            <Outlet />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </AdminDashboardProvider>
  );
}
