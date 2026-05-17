import React, { useState, useEffect } from 'react';
import { ShieldAlert, AlertTriangle, Crosshair, MapPin, Zap, CheckCircle2, Clock } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import PremiumButton from '../components/PremiumButton';
import AnimatedSection from '../components/AnimatedSection';
import ComplaintDetailsModal from '../components/ComplaintDetailsModal';
import { useAuth } from '../context/AuthContext';

export default function EmergencyCommand() {
  const { userProfile } = useAuth();
  const [emergencies, setEmergencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [acknowledging, setAcknowledging] = useState(null);

  useEffect(() => {
    fetchEmergencies();
    const interval = setInterval(fetchEmergencies, 15000); // Poll every 15s for live command updates
    return () => clearInterval(interval);
  }, []);

  const fetchEmergencies = async () => {
    try {
      const token = localStorage.getItem('tsrv_session_token');
      const res = await fetch('/api/emergency/active', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setEmergencies(data.emergencies);
      }
    } catch (err) {
      console.error('Failed to load emergency queue', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (id, e) => {
    e.stopPropagation();
    setAcknowledging(id);
    try {
      const token = localStorage.getItem('tsrv_session_token');
      const res = await fetch(`/api/emergency/${id}/acknowledge`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action_note: 'State Command HQ has acknowledged the critical distress signal and dispatched local handler authority.' })
      });
      const data = await res.json();
      if (data.success) {
        await fetchEmergencies();
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error('Failed to acknowledge emergency', err);
    } finally {
      setAcknowledging(null);
    }
  };

  const activeCount = emergencies.filter(e => e.resolution_status === 'active').length;

  return (
    <div className="w-full flex flex-col gap-6 animate-fadeIn">
      
      {/* Command Header */}
      <div className={`p-6 md:p-10 rounded-3xl border relative overflow-hidden transition-colors duration-500 ${activeCount > 0 ? 'bg-rose-950/20 border-rose-500/40 shadow-glow-rose' : 'bg-slate-900/40 border-slate-700/50'}`}>
        {activeCount > 0 && <div className="absolute inset-0 bg-rose-500/10 animate-pulse pointer-events-none" />}
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-start gap-4">
            <div className={`p-4 rounded-2xl ${activeCount > 0 ? 'bg-rose-500 text-white shadow-glow-rose animate-bounce' : 'bg-slate-800 text-slate-400'}`}>
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div>
              <h1 className={`text-2xl md:text-3xl font-black uppercase tracking-tight ${activeCount > 0 ? 'text-rose-500' : 'text-slate-300'}`}>
                Emergency Command HQ
              </h1>
              <p className="text-slate-400 text-sm mt-1 max-w-xl">
                Statewide high-velocity panic dispatch grid. Authorized state-level nodes can intercept, acknowledge, and override critical student grievances immediately.
              </p>
            </div>
          </div>
          
          <div className="flex flex-col items-end shrink-0">
            <span className={`text-5xl font-black ${activeCount > 0 ? 'text-rose-500' : 'text-slate-500'}`}>{activeCount}</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Active Crisis Alerts</span>
          </div>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center p-12"><div className="w-10 h-10 border-4 border-t-rose-500 border-r-transparent border-rose-500/20 rounded-full animate-spin shadow-glow-rose" /></div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {emergencies.length > 0 ? emergencies.map((em, idx) => {
            const isActive = em.resolution_status === 'active';
            
            return (
              <AnimatedSection key={em.id} delay={idx * 0.1}>
                <div 
                  onClick={() => setSelectedTicketId(em.id)}
                  className={`p-6 rounded-2xl border cursor-pointer transition-all duration-300 flex flex-col gap-4 relative overflow-hidden group hover:scale-[1.01] ${isActive ? 'bg-rose-950/10 border-rose-500/30 hover:border-rose-500/60' : 'bg-slate-900/30 border-slate-800 hover:border-cyan-500/40'}`}
                >
                  {isActive && <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 blur-3xl group-hover:bg-rose-500/20 transition-colors" />}

                  <div className="flex justify-between items-start relative z-10">
                    <div className="flex flex-col gap-1 pr-4">
                      <div className="flex items-center gap-2">
                        {isActive ? <Zap className="w-4 h-4 text-rose-500 animate-pulse" /> : <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${isActive ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'}`}>
                          {isActive ? 'CRITICAL DISPATCH REQUIRED' : 'COMMAND ACKNOWLEDGED'}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-white mt-1">{em.title}</h3>
                      <span className="text-xs text-slate-400 font-mono tracking-wide">Ticket #{em.id} • T-{Math.round((new Date() - new Date(em.dispatched_at))/60000)} mins ago</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 relative z-10">
                    <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                      <span className="text-[9px] uppercase font-bold tracking-wider text-slate-500 flex items-center gap-1.5 mb-1"><MapPin className="w-3 h-3" /> Location Node</span>
                      <span className="text-xs font-bold text-slate-200 truncate">{em.college_name || 'State'}</span>
                      <span className="text-[10px] text-slate-400 block truncate">{em.constituency_name || 'State Scope'}</span>
                    </div>
                    <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                      <span className="text-[9px] uppercase font-bold tracking-wider text-slate-500 flex items-center gap-1.5 mb-1"><Crosshair className="w-3 h-3" /> Identity Mask</span>
                      <span className="text-xs font-bold text-slate-200 truncate">{em.anonymous ? 'CONFIDENTIAL WHISTLEBLOWER' : em.student_name}</span>
                      {!em.anonymous && <span className="text-[10px] text-slate-400 block">{em.student_phone}</span>}
                    </div>
                  </div>

                  {isActive && (
                    <div className="mt-2 relative z-10 flex gap-3">
                      <button 
                        onClick={(e) => handleAcknowledge(em.id, e)}
                        disabled={acknowledging === em.id}
                        className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-glow-rose transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {acknowledging === em.id ? <div className="w-4 h-4 border-2 border-t-white border-r-transparent rounded-full animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
                        {acknowledging === em.id ? 'Intercepting...' : 'Intercept & Acknowledge'}
                      </button>
                    </div>
                  )}

                </div>
              </AnimatedSection>
            );
          }) : (
            <div className="col-span-1 xl:col-span-2 py-20 flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-3xl">
              <ShieldCheck className="w-16 h-16 text-emerald-500/50 mb-4" />
              <h3 className="text-xl font-black text-slate-300 uppercase tracking-widest">State Grid Secure</h3>
              <p className="text-slate-500 text-sm mt-2">Zero active emergencies across all constituencies.</p>
            </div>
          )}
        </div>
      )}

      {selectedTicketId && (
        <ComplaintDetailsModal 
          ticketId={selectedTicketId} 
          onClose={() => setSelectedTicketId(null)} 
          userProfile={userProfile} 
          onUpdateSuccess={fetchEmergencies}
        />
      )}

    </div>
  );
}
