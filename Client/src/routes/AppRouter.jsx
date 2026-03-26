import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import { Toaster } from 'react-hot-toast';

// Import route components
import ProtectedRoute, { PublicRoute } from './ProtectedRoute';

console.log('AppRouter imported'); // Debug log

// Layouts
import MainLayout from '../layouts/MainLayout';
import AuthLayout from '../layouts/AuthLayout';

// Pages
import LoginPage from '../features/auth/LoginPage';
import RegisterPage from '../features/auth/RegisterPage';
import DashboardPage from '../features/dashboard/DashboardPage';
import PayrollDashboard from '../features/payroll/PayrollDashboard';
import PayrollManagement from '../features/payroll/PayrollManagement';
import ManageEmployees from '../features/payroll/ManageEmployees';
import WorkHours from '../features/payroll/WorkHours';
import HourlyRates from '../features/payroll/HourlyRates';
import PeriodSettings from '../features/payroll/PeriodSettings';
import PaySlipGenerator from '../features/payroll/PaySlipGenerator';

// App Routes Component
const AppRoutes = () => {
  return (
    <Routes>
      {/* Test Route */}
      <Route 
        path="/test" 
        element={<div style={{padding: '20px', background: 'green', color: 'white'}}>Test Route Working!</div>} 
      />
      
      {/* Public Routes */}
      <Route 
        path="/login" 
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        } 
      />
      <Route 
        path="/register" 
        element={
          <PublicRoute>
            <AuthLayout>
              <RegisterPage />
            </AuthLayout>
          </PublicRoute>
        } 
      />
      
      {/* Protected Routes - All using PayrollManagement layout */}
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <PayrollManagement />
          </ProtectedRoute>
        }
      >
        <Route index element={<PayrollDashboard />} />
      </Route>
      
      {/* Payroll Routes */}
      <Route 
        path="/ManageEmployees" 
        element={
          <ProtectedRoute>
            <PayrollManagement />
          </ProtectedRoute>
        }
      >
        <Route index element={<ManageEmployees />} />
      </Route>
      <Route 
        path="/WorkHours" 
        element={
          <ProtectedRoute>
            <PayrollManagement />
          </ProtectedRoute>
        }
      >
        <Route index element={<WorkHours />} />
      </Route>
      <Route 
        path="/HourlyRates" 
        element={
          <ProtectedRoute>
            <PayrollManagement />
          </ProtectedRoute>
        }
      >
        <Route index element={<HourlyRates />} />
      </Route>
      <Route 
        path="/PeriodSettings" 
        element={
          <ProtectedRoute>
            <PayrollManagement />
          </ProtectedRoute>
        }
      >
        <Route index element={<PeriodSettings />} />
      </Route>
      <Route 
        path="/PaySlipGenerator" 
        element={
          <ProtectedRoute>
            <PayrollManagement />
          </ProtectedRoute>
        }
      >
        <Route index element={<PaySlipGenerator />} />
      </Route>
      
      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      
      {/* Catch all route */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

// Main App Router Component
const AppRouter = () => {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: '#22c55e',
                  secondary: '#fff',
                },
              },
              error: {
                duration: 5000,
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
};

export default AppRouter;
