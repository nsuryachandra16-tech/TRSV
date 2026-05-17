import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import ProtectedRoute from '../components/ProtectedRoute';

// Layouts
import RootLayout from '../layouts/RootLayout';
import DashboardLayout from '../layouts/DashboardLayout';

// Lazy load all pages for high page-load performance
const Home = lazy(() => import('../pages/Home'));
const About = lazy(() => import('../pages/About'));
const Features = lazy(() => import('../pages/Features'));
const Transparency = lazy(() => import('../pages/Transparency'));
const Districts = lazy(() => import('../pages/Districts'));
const Team = lazy(() => import('../pages/Team'));
const SupportHub = lazy(() => import('../pages/SupportHub'));
const Announcements = lazy(() => import('../pages/Announcements'));
const Contact = lazy(() => import('../pages/Contact'));
const Login = lazy(() => import('../pages/Login'));
const Signup = lazy(() => import('../pages/Signup'));

// Digital Identity Ecosystem Pages
const DigitalIdCard = lazy(() => import('../pages/DigitalIdCard'));
const PublicVerification = lazy(() => import('../pages/PublicVerification'));
const QrScanExperience = lazy(() => import('../pages/QrScanExperience'));
const IdManagement = lazy(() => import('../pages/IdManagement'));

// Dashboards
const StudentDashboard = lazy(() => import('../pages/StudentDashboard'));
const LeaderDashboard = lazy(() => import('../pages/LeaderDashboard'));
const CommandCenter = lazy(() => import('../pages/CommandCenter'));
const EmergencyCommand = lazy(() => import('../pages/EmergencyCommand'));

// Futuristic Holographic Loading Spinner
function PageLoader() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-tsrv-bg-light dark:bg-tsrv-bg-dark transition-colors duration-300">
      <div className="relative flex flex-col items-center">
        {/* Glowing rings */}
        <div className="w-20 h-20 border-4 border-slate-200 dark:border-slate-880 rounded-full" />
        <div className="absolute w-20 h-20 border-4 border-transparent border-t-cyan-500 border-r-sky-500 rounded-full animate-spin" />
        <div className="absolute w-14 h-14 border-2 border-transparent border-b-cyan-400 border-l-blue-400 rounded-full animate-[spin_1s_linear_infinite_reverse]" />
        
        {/* Glowing Center Core */}
        <div className="absolute top-[28px] left-[28px] w-6 h-6 bg-cyan-400 rounded-full animate-ping opacity-60" />
        <div className="absolute top-[32px] left-[32px] w-4 h-4 bg-cyan-500 rounded-full shadow-glow-cyan-strong" />

        <h3 className="mt-8 font-semibold tracking-wider text-sm uppercase text-slate-600 dark:text-cyan-400 animate-pulse">
          TSRV Quantum Terminal
        </h3>
        <p className="mt-1 text-xs text-slate-440 dark:text-slate-550">
          Syncing statewide governance node...
        </p>
      </div>
    </div>
  );
}

export default function AppRoutes() {
  const location = useLocation();

  return (
    <Suspense fallback={<PageLoader />}>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
        {/* Public Landing Pages Group */}
        <Route element={<RootLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/verify/:token_or_id" element={<PublicVerification />} />
        </Route>

        {/* Secure Dashboard Pages Group */}
        <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/dashboard/student" replace />} />
          
          <Route path="student" element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentDashboard />
            </ProtectedRoute>
          } />
          
          <Route path="leader" element={
            <ProtectedRoute allowedRoles={['secretary', 'general_secretary', 'vice_president', 'president']}>
              <LeaderDashboard />
            </ProtectedRoute>
          } />
          
          <Route path="command" element={
            <ProtectedRoute allowedRoles={['supreme_admin']}>
              <CommandCenter />
            </ProtectedRoute>
          } />

          <Route path="command/identities" element={
            <ProtectedRoute allowedRoles={['supreme_admin']}>
              <IdManagement />
            </ProtectedRoute>
          } />
          
          <Route path="emergency" element={
            <ProtectedRoute allowedRoles={['vice_president', 'president', 'supreme_admin']}>
              <EmergencyCommand />
            </ProtectedRoute>
          } />
          
          <Route path="digital-id" element={<DigitalIdCard />} />
          <Route path="qr-scanner" element={<QrScanExperience />} />
          <Route path="support" element={<SupportHub />} />
          <Route path="districts" element={<Districts />} />
          <Route path="transparency" element={<Transparency />} />
          <Route path="about" element={<About />} />
          <Route path="team" element={<Team />} />
          <Route path="announcements" element={<Announcements />} />
          <Route path="contact" element={<Contact />} />
        </Route>

          {/* Catch-all Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </Suspense>
  );
}
