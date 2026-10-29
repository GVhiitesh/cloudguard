import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import type { Role } from '@/types/api';

/** Redirects to /login (remembering where we were) if there is no token. */
export function ProtectedRoute() {
  const token = useAuthStore((s) => s.token);
  const location = useLocation();
  if (!token) return <Navigate to="/login" state={{ from: location }} replace />;
  return <Outlet />;
}

/** Gate for admin/editor-only pages. Backend enforces too — this is UX only. */
export function RoleRoute({ roles }: { roles: Role[] }) {
  const role = useAuthStore((s) => s.user?.role);
  if (!role || !roles.includes(role)) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
