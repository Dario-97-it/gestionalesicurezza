import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Toaster } from 'react-hot-toast';

// Lazy load all pages according to GESTIONALECOMEVAFATTO.docx
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Companies = lazy(() => import('./pages/Companies'));
const CompanyDetail = lazy(() => import('./pages/CompanyDetail'));
const Students = lazy(() => import('./pages/Students'));
const StudentDetail = lazy(() => import('./pages/StudentDetail'));
const Services = lazy(() => import('./pages/Services'));
const Instructors = lazy(() => import('./pages/Instructors'));
const InstructorDetail = lazy(() => import('./pages/InstructorDetail'));
const Agents = lazy(() => import('./pages/Agents'));
const AgentDetail = lazy(() => import('./pages/AgentDetail'));
const Editions = lazy(() => import('./pages/Editions'));
const EditionRegister = lazy(() => import('./pages/EditionRegister'));
const Attendances = lazy(() => import('./pages/Attendances'));
const Registrations = lazy(() => import('./pages/Registrations'));
const Reports = lazy(() => import('./pages/Reports'));
const Scadenzario = lazy(() => import('./pages/Scadenzario'));
const Calendar = lazy(() => import('./pages/CalendarView'));
const Imports = lazy(() => import('./pages/Imports'));
const EmailSettings = lazy(() => import('./pages/EmailSettings').then(m => ({ default: m.EmailSettings })));

// Loading component
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Caricamento GestionaleSicurezza...</p>
      </div>
    </div>
  );
}

// Protected Route
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <PageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

// Public Route
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <PageLoader />;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        
        {/* Home / Dashboard (Pagina 1) */}
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        
        {/* Aziende (Pagina 2) */}
        <Route path="/companies" element={<ProtectedRoute><Companies /></ProtectedRoute>} />
        <Route path="/companies/:id" element={<ProtectedRoute><CompanyDetail /></ProtectedRoute>} />
        
        {/* Studenti (Pagina 3) */}
        <Route path="/students" element={<ProtectedRoute><Students /></ProtectedRoute>} />
        <Route path="/students/:id" element={<ProtectedRoute><StudentDetail /></ProtectedRoute>} />
        
        {/* Servizi Offerti (Pagina 4) */}
        <Route path="/services" element={<ProtectedRoute><Services /></ProtectedRoute>} />
        
        {/* Docenti (Pagina 5) */}
        <Route path="/instructors" element={<ProtectedRoute><Instructors /></ProtectedRoute>} />
        <Route path="/instructors/:id" element={<ProtectedRoute><InstructorDetail /></ProtectedRoute>} />
        
        {/* Agenti (Pagina 6) */}
        <Route path="/agents" element={<ProtectedRoute><Agents /></ProtectedRoute>} />
        <Route path="/agents/:id" element={<ProtectedRoute><AgentDetail /></ProtectedRoute>} />
        
        {/* Edizioni (Pagina 7) */}
        <Route path="/editions" element={<ProtectedRoute><Editions /></ProtectedRoute>} />
        <Route path="/editions/:id/register" element={<ProtectedRoute><EditionRegister /></ProtectedRoute>} />
        
        {/* Registro Presenze (Pagina 8) - Legacy, ora integrato in EditionRegister */}
        <Route path="/attendances" element={<ProtectedRoute><Attendances /></ProtectedRoute>} />
        
        {/* Iscrizioni (Pagina 9) */}
        <Route path="/registrations" element={<ProtectedRoute><Registrations /></ProtectedRoute>} />
        
        {/* Report (Pagina 10) */}
        <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
        
        {/* Scadenzario (Nuova Pagina integrata in Report/Compliance) */}
        <Route path="/scadenzario" element={<ProtectedRoute><Scadenzario /></ProtectedRoute>} />
        
        {/* Calendario (Pagina 12) */}
        <Route path="/calendar" element={<ProtectedRoute><Calendar /></ProtectedRoute>} />
        
        {/* Importazioni */}
        <Route path="/imports" element={<ProtectedRoute><Imports /></ProtectedRoute>} />
        
        {/* Impostazioni (Pagina 13) */}
        <Route path="/settings" element={<ProtectedRoute><EmailSettings /></ProtectedRoute>} />
        
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
