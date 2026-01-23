import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Toaster } from 'react-hot-toast';

// Lazy load all pages for better performance
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Companies = lazy(() => import('./pages/Companies'));
const CompanyDetail = lazy(() => import('./pages/CompanyDetail'));
const Students = lazy(() => import('./pages/Students'));
const StudentDetail = lazy(() => import('./pages/StudentDetail'));
const Courses = lazy(() => import('./pages/Courses'));
const Editions = lazy(() => import('./pages/Editions'));
const Registrations = lazy(() => import('./pages/Registrations'));
const Attendances = lazy(() => import('./pages/Attendances'));
const Instructors = lazy(() => import('./pages/Instructors'));
const Profile = lazy(() => import('./pages/Profile'));
const Certificates = lazy(() => import('./pages/Certificates'));
const Reports = lazy(() => import('./pages/Reports'));
const EmailSettings = lazy(() => import('./pages/EmailSettings').then(m => ({ default: m.EmailSettings })));
const CertificateNotifications = lazy(() => import('./pages/CertificateNotifications'));
const BatchRegistrations = lazy(() => import('./pages/BatchRegistrations'));
const CalendarView = lazy(() => import('./pages/CalendarView'));
const BatchImport = lazy(() => import('./pages/BatchImport'));

// Loading component for Suspense fallback
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Caricamento...</p>
      </div>
    </div>
  );
}

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <PageLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Public Route Component (redirect to dashboard if authenticated)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <PageLoader />;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/companies"
          element={
            <ProtectedRoute>
              <Companies />
            </ProtectedRoute>
          }
        />
        <Route
          path="/companies/:id"
          element={
            <ProtectedRoute>
              <CompanyDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/students"
          element={
            <ProtectedRoute>
              <Students />
            </ProtectedRoute>
          }
        />
        <Route
          path="/students/:id"
          element={
            <ProtectedRoute>
              <StudentDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/courses"
          element={
            <ProtectedRoute>
              <Courses />
            </ProtectedRoute>
          }
        />
        <Route
          path="/editions"
          element={
            <ProtectedRoute>
              <Editions />
            </ProtectedRoute>
          }
        />
        <Route
          path="/registrations"
          element={
            <ProtectedRoute>
              <Registrations />
            </ProtectedRoute>
          }
        />
        <Route
          path="/attendances"
          element={
            <ProtectedRoute>
              <Attendances />
            </ProtectedRoute>
          }
        />
        <Route
          path="/instructors"
          element={
            <ProtectedRoute>
              <Instructors />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/certificates"
          element={
            <ProtectedRoute>
              <Certificates />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <Reports />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings/email"
          element={
            <ProtectedRoute>
              <EmailSettings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications/certificates"
          element={
            <ProtectedRoute>
              <CertificateNotifications />
            </ProtectedRoute>
          }
        />
        <Route
          path="/registrations/batch"
          element={
            <ProtectedRoute>
              <BatchRegistrations />
            </ProtectedRoute>
          }
        />
      <Route
        path="/calendar"
        element={
          <ProtectedRoute>
            <CalendarView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/import"
        element={
          <ProtectedRoute>
            <BatchImport />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster position="top-right" />
      </AuthProvider>
    </BrowserRouter>
  );
}
