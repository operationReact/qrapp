import { AdminSidebar } from "@/components/admin/AdminSidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Outlet } from "react-router-dom";
import { AdminDashboardProvider } from "@/context/AdminDashboardContext";

export default function AdminLayout() {
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
