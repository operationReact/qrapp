import { Navigate, useLocation } from "@tanstack/react-router";
import { useAuth } from "@/context/AuthContext";
import { hasRole } from "@/lib/roles";

export function RoleGuard({ roles, children }) {
  const { user, authInitialized } = useAuth();
  const location = useLocation();
  if (!authInitialized) return <div className="p-6 text-sm text-muted-foreground">Loading access…</div>;
  if (!user?.token) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!hasRole(user, roles)) return <Navigate to="/admin" replace />;
  return children;
}
