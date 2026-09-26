import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore.js';

// Layouts
import AuthLayout from './layouts/AuthLayout.jsx';
import DashboardLayout from './layouts/DashboardLayout.jsx';

// Common Components
import ProtectedRoute from './components/common/ProtectedRoute.jsx';

// Auth Pages
import Login from './pages/auth/Login.jsx';
import Register from './pages/auth/Register.jsx';

// Dashboard Pages
import PatientDashboard from './pages/patient/PatientDashboard.jsx';
import DoctorDashboard from './pages/doctor/DoctorDashboard.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';

export const App = () => {
  const { isAuthenticated, role, fetchMe } = useAuthStore();

  useEffect(() => {
    // Re-verify session and reconnect Socket.io on initial client mount
    fetchMe();
  }, [fetchMe]);

  // Root redirect calculation
  const getRootRedirect = () => {
    if (!isAuthenticated) return '/login';
    if (role === 'patient') return '/patient';
    if (role === 'doctor') return '/doctor';
    if (role === 'admin') return '/admin';
    return '/login';
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* Root Redirect */}
        <Route path="/" element={<Navigate to={getRootRedirect()} replace />} />

        {/* Public Authentication Routes */}
        <Route element={<AuthLayout />}>
          <Route
            path="/login"
            element={isAuthenticated ? <Navigate to={getRootRedirect()} replace /> : <Login />}
          />
          <Route
            path="/register"
            element={isAuthenticated ? <Navigate to={getRootRedirect()} replace /> : <Register />}
          />
        </Route>

        {/* Protected Dashboard Routes with Shared DashboardLayout */}
        <Route element={<DashboardLayout />}>
          {/* Patient Routes */}
          <Route element={<ProtectedRoute allowedRoles={['patient']} />}>
            <Route path="/patient" element={<PatientDashboard />} />
            <Route path="/patient/*" element={<PatientDashboard />} />
          </Route>

          {/* Doctor Routes */}
          <Route element={<ProtectedRoute allowedRoles={['doctor']} />}>
            <Route path="/doctor" element={<DoctorDashboard />} />
            <Route path="/doctor/*" element={<DoctorDashboard />} />
          </Route>

          {/* Admin Routes */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/*" element={<AdminDashboard />} />
          </Route>
        </Route>

        {/* Catch-all redirect to root */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
