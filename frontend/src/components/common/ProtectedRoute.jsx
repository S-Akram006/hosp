import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore.js';
import LoadingSpinner from './LoadingSpinner.jsx';

/**
 * ProtectedRoute: Enforces authentication and role-based access control
 * @param {string[]} allowedRoles - Array of roles permitted to access this route
 */
export const ProtectedRoute = ({ allowedRoles = [] }) => {
  const { isAuthenticated, role, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoadingSpinner text="Checking authentication status..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If specific roles are required, verify match
  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    // Redirect user to their own role dashboard
    const defaultRoute =
      role === 'patient' ? '/patient' : role === 'doctor' ? '/doctor' : '/admin';
    return <Navigate to={defaultRoute} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
