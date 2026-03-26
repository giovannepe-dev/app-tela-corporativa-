import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { canAccessRoute } from "@/lib/permissions";
import { Loader2 } from "lucide-react";

export default function RoleGuard({ children }: { children: React.ReactNode }) {
  const { roles, loading } = useAuth();
  const location = useLocation();

  // Don't redirect while roles are still loading
  if (loading || roles.length === 0) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!canAccessRoute(location.pathname, roles)) {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
}
