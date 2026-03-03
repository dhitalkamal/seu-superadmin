import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/shared/store/auth.store";

/** Redirects to /login if not authenticated or if the user is not staff/superuser. */
export default function RequireAuth({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.is_staff || user?.is_superuser;
  if (!isAuthenticated || !isAdmin) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
