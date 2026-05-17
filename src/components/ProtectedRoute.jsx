import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert } from 'lucide-react';
import GlassCard from './GlassCard';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { userProfile, loading } = useAuth();

  // Show a premium glassmorphic loading spinner while fetching active session
  if (loading) {
    return (
      <div className="w-full min-h-[80vh] flex items-center justify-center">
        <div className="relative flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-t-cyan-500 border-r-transparent border-slate-200 dark:border-slate-800 animate-spin" />
          <p className="text-xs font-semibold tracking-widest text-slate-400 dark:text-slate-500 uppercase animate-pulse">
            Syncing Credentials Node...
          </p>
        </div>
      </div>
    );
  }

  // 1. If not authenticated, redirect to standard login view
  if (!userProfile) {
    return <Navigate to="/login" replace />;
  }

  // 2. If role-specific guards are defined, check active permissions
  if (allowedRoles && !allowedRoles.includes(userProfile.role)) {
    console.warn(`🛡️ [Guard Alert] User of role "${userProfile.role}" attempted unauthorized access to restricted panel.`);
    
    // Redirect to correct dashboard bounds
    if (userProfile.role === 'supreme_admin') {
      return <Navigate to="/dashboard/command" replace />;
    } else if (userProfile.role === 'student') {
      return <Navigate to="/dashboard/student" replace />;
    } else {
      return <Navigate to="/dashboard/leader" replace />;
    }
  }

  // Render protected child views
  return children;
}
