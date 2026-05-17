import React, { useState, useEffect } from 'react';
import { ShieldCheck, Activity, Users, Clock, AlertTriangle, ChevronRight, BarChart2, ShieldAlert } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import AnimatedSection from '../components/AnimatedSection';

export default function Transparency() {
  const [metrics, setMetrics] = useState(null);
  const [rankings, setRankings] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTransparencyData();
  }, []);

  const fetchTransparencyData = async () => {
    try {
      const [metricsRes, rankingsRes, activityRes] = await Promise.all([
        fetch('/api/transparency/metrics'),
        fetch('/api/transparency/rankings'),
        fetch('/api/transparency/activity')
      ]);
      
      const metricsData = await metricsRes.json();
      const rankingsData = await rankingsRes.json();
      const activityData = await activityRes.json();

      if (metricsData.success) setMetrics(metricsData.metrics);
      if (rankingsData.success) setRankings(rankingsData.rankings);
      if (activityData.success) setActivity(activityData.activity);
    } catch (err) {
      console.error('Failed to load transparency metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[70vh]">
        <div className="w-16 h-16 border-4 border-slate-200 dark:border-slate-800 rounded-full relative">
          <div className="absolute inset-0 border-4 border-transparent border-t-cyan-500 rounded-full animate-spin shadow-glow-cyan" />
        </div>
        <p className="mt-6 text-sm font-bold tracking-widest text-slate-500 uppercase animate-pulse">Syncing Accountability Nodes...</p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-12 py-8 animate-fadeIn">
      
      {/* Hero Header */}
      <AnimatedSection direction="up" className="text-center max-w-4xl mx-auto flex flex-col gap-4">
        <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400 tracking-widest uppercase flex items-center justify-center gap-2">
          <ShieldCheck className="w-4 h-4" /> Open Governance Protocol Active
        </span>
        <h1 className="fluid-heading-2 font-black text-slate-850 dark:text-white leading-tight">
          Public Accountability Portal
        </h1>
        <p className="text-base sm:text-lg text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl mx-auto">
          TSRV operates with 100% transparency. Every grievance tracked, every emergency dispatched, and every constituency ranked publicly for total systemic accountability.
        </p>
      </AnimatedSection>

      {/* Top Metrics Row */}
      <AnimatedSection delay={0.1} className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        <GlassCard className="p-6 flex flex-col items-center text-center gap-3">
          <div className="p-3 rounded-full bg-cyan-500/10 text-cyan-500">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-3xl font-black text-slate-850 dark:text-white">{metrics?.totalComplaints || 0}</h3>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Tickets</span>
          </div>
        </GlassCard>

        <GlassCard className="p-6 flex flex-col items-center text-center gap-3 relative overflow-hidden group">
          <div className="absolute inset-0 bg-green-500/5 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
          <div className="p-3 rounded-full bg-green-500/10 text-green-500 relative z-10">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="relative z-10">
            <h3 className="text-3xl font-black text-slate-850 dark:text-white">{metrics?.resolvedComplaints || 0}</h3>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Resolved Issues</span>
          </div>
        </GlassCard>

        <GlassCard className="p-6 flex flex-col items-center text-center gap-3">
          <div className="p-3 rounded-full bg-rose-500/10 text-rose-500 shadow-glow-rose">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-3xl font-black text-rose-500">{metrics?.criticalEmergencies || 0}</h3>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Panic Responded</span>
          </div>
        </GlassCard>

        <GlassCard className="p-6 flex flex-col items-center text-center gap-3">
          <div className="p-3 rounded-full bg-amber-500/10 text-amber-500">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-3xl font-black text-slate-850 dark:text-white">{metrics?.averageResolutionHours || 0}<span className="text-lg">h</span></h3>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Avg Resolution</span>
          </div>
        </GlassCard>
      </AnimatedSection>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Constituency Leaderboard */}
        <AnimatedSection delay={0.2} className="flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-500">
              <BarChart2 className="w-5 h-5" />
            </div>
            <h2 className="font-extrabold text-xl text-slate-850 dark:text-white tracking-tight">Performance Rankings</h2>
          </div>
          
          <GlassCard className="flex flex-col gap-1 p-2">
            {rankings.length > 0 ? rankings.map((con, idx) => (
              <div key={idx} className="flex items-center p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors gap-4">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${idx === 0 ? 'bg-amber-500/20 text-amber-500 shadow-glow-amber border border-amber-500/30' : idx === 1 ? 'bg-slate-300 dark:bg-slate-700 text-slate-600 dark:text-white' : idx === 2 ? 'bg-orange-500/20 text-orange-500' : 'bg-slate-100 dark:bg-slate-900 text-slate-400'}`}>
                  #{idx + 1}
                </span>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="font-bold text-sm text-slate-850 dark:text-white truncate">{con.name}</span>
                  <span className="text-[10px] text-slate-400">{con.resolved_tickets} / {con.total_tickets} Resolved</span>
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <span className="font-black text-cyan-600 dark:text-cyan-400">{con.resolution_rate}%</span>
                  <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Clear Rate</span>
                </div>
              </div>
            )) : (
              <div className="py-10 text-center text-sm font-bold text-slate-400 uppercase tracking-wider">No active rankings yet.</div>
            )}
          </GlassCard>
        </AnimatedSection>

        {/* Real-time Activity Ledger */}
        <AnimatedSection delay={0.3} className="flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-200 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400">
              <Activity className="w-5 h-5" />
            </div>
            <h2 className="font-extrabold text-xl text-slate-850 dark:text-white tracking-tight">Live Operations Ledger</h2>
          </div>

          <GlassCard className="flex flex-col gap-1 p-2 overflow-hidden relative h-full max-h-[500px]">
            <div className="absolute top-0 inset-x-0 h-6 bg-gradient-to-b from-white dark:from-slate-850 to-transparent z-10 pointer-events-none" />
            <div className="absolute bottom-0 inset-x-0 h-10 bg-gradient-to-t from-white dark:from-slate-850 to-transparent z-10 pointer-events-none" />
            
            <div className="flex-1 overflow-y-auto pr-2 custom-sidebar-scrollbar flex flex-col gap-2 py-4">
              {activity.length > 0 ? activity.map((act) => (
                <div key={act.id} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      Ticket #{act.id}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">{new Date(act.updated_at).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-sm text-slate-800 dark:text-white truncate">{act.category} Dispute</span>
                      <span className="text-xs text-slate-500 truncate flex items-center gap-1.5 mt-0.5">
                        <Users className="w-3.5 h-3.5" /> 
                        {act.constituency_name || 'State Scope'}
                      </span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded shrink-0 border ${
                      act.status === 'Resolved' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 
                      act.status === 'Under Investigation' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 
                      'bg-cyan-500/10 text-cyan-500 border-cyan-500/20'
                    }`}>
                      {act.status}
                    </span>
                  </div>
                </div>
              )) : (
                <div className="py-10 text-center text-sm font-bold text-slate-400 uppercase tracking-wider">Ledger currently silent.</div>
              )}
            </div>
          </GlassCard>
        </AnimatedSection>
      </div>

    </div>
  );
}
