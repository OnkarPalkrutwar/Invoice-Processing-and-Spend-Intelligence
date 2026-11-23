import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { PublicRoute } from './PublicRoute';

// Page Views
import { Login } from '../pages/Login';
import { Register } from '../pages/Register';
import { Dashboard } from '../pages/Dashboard';
import { InvoiceList } from '../pages/InvoiceList';
import { InvoiceUpload } from '../pages/InvoiceUpload';
import { InvoiceDetails } from '../pages/InvoiceDetails';
import { InvoiceEdit } from '../pages/InvoiceEdit';
import { Approvals } from '../pages/Approvals';
import { Vendors } from '../pages/Vendors';
import { VendorDetails } from '../pages/VendorDetails';
import { SpendAnalytics } from '../pages/SpendAnalytics';
import { Reports } from '../pages/Reports';
import { Notifications } from '../pages/Notifications';
import { Settings } from '../pages/Settings';
import { NotFound } from '../pages/NotFound';

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Authentication Routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        }
      />

      {/* Protected Enterprise Workspace Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="invoices" element={<InvoiceList />} />
        <Route path="upload" element={<InvoiceUpload />} />
        <Route path="invoices/:id" element={<InvoiceDetails />} />
        <Route path="invoices/:id/edit" element={<InvoiceEdit />} />
        <Route
          path="approvals"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'FINANCE_MANAGER']}>
              <Approvals />
            </ProtectedRoute>
          }
        />
        <Route path="vendors" element={<Vendors />} />
        <Route path="vendors/:id" element={<VendorDetails />} />
        <Route path="spend-intelligence" element={<SpendAnalytics />} />
        <Route path="reports" element={<Reports />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
};
