import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useParliament } from "../infrastructure/context/ParliamentContext";

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requiredRoles?: Array<"admin" | "speaker" | "member">;
}

export function AuthGuard({
  children,
  requireAuth = true,
  requiredRoles
}: AuthGuardProps) {
  const { currentUser } = useParliament();
  const location = useLocation();

  // Route requires authentication, but user is not logged in
  if (requireAuth && !currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Route has specific role restrictions (e.g. Admin only for register)
  if (requireAuth && currentUser && requiredRoles && requiredRoles.length > 0) {
    if (!requiredRoles.includes(currentUser.role)) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  // If already logged in and visiting /login, redirect to /dashboard
  if (!requireAuth && currentUser && location.pathname === "/login") {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

export default AuthGuard;
