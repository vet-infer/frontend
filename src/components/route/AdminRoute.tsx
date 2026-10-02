import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

export function AdminRoute() {
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return <Navigate replace to="/home" />;
  }

  return <Outlet />;
}
