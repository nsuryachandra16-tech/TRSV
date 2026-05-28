import React from 'react';
import { useAuth } from '../context/AuthContext';
import HubChat from '../components/HubChat';
import { Navigate } from 'react-router-dom';

export default function MessengerPage() {
  const { userProfile } = useAuth();

  if (!userProfile) {
    return <Navigate to="/login" replace />;
  }

  // Restrict to admins/leaders
  if (userProfile.role === 'student') {
    return <Navigate to="/dashboard/student" replace />;
  }

  return (
    <div className="w-full h-full flex flex-col gap-4 animate-fadeIn text-left">
      <div className="flex flex-col gap-1 shrink-0">
        <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white uppercase tracking-wider">
          Messenger Node
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-widest font-semibold">
          Secure Statewide Admin Coordination Terminal
        </p>
      </div>

      <HubChat 
        user={{
          id: userProfile.id,
          role: userProfile.role,
          full_name: userProfile.full_name,
          constituency_name: userProfile.constituency_name || userProfile.constituency
        }} 
      />
    </div>
  );
}
