import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { canAccessRoute } from "@/lib/permissions";

export default function RoleGuard({ children }: { children: React.ReactNode }) {
  const { roles } = useAuth();
  const location = useLocation();

  if (!canAccessRoute(location.pathname, roles)) {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
}
