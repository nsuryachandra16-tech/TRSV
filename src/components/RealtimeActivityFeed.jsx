import React from 'react';
import { Activity, ShieldAlert, CheckCircle2, RefreshCw } from 'lucide-react';
import GlassCard from './GlassCard';

export default function RealtimeActivityFeed({ activities = [], title = "Live Operations Feed" }) {
  return (
    <GlassCard className="flex flex-col h-full overflow-hidden border border-slate-200/50 dark:border-slate-800">
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-500" />
          {title}
        </h3>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
          </span>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Live Sync</span>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto custom-sidebar-scrollbar p-3 flex flex-col gap-2 relative">
        <div className="absolute top-0 inset-x-0 h-4 bg-gradient-to-b from-white dark:from-slate-850 to-transparent z-10 pointer-events-none" />
        
        {activities.length > 0 ? activities.map((act, i) => (
          <div key={i} className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 flex gap-3 group hover:border-cyan-500/30 transition-colors">
            <div className="shrink-0 mt-0.5">
              {act.severity === 'warning' ? (
                <ShieldAlert className="w-4 h-4 text-amber-500" />
              ) : act.severity === 'critical' ? (
                <ShieldAlert className="w-4 h-4 text-rose-500" />
              ) : act.severity === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              ) : (
                <RefreshCw className="w-4 h-4 text-cyan-500" />
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 leading-tight">
                {act.event_message}
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  {act.event_type.replace(/_/g, ' ')}
                </span>
                <span className="text-[9px] text-slate-500 font-mono">
                  {new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
            </div>
          </div>
        )) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60 p-6 text-center">
            <Activity className="w-8 h-8 mb-2" />
            <span className="text-[10px] font-black uppercase tracking-widest">Feed Empty</span>
          </div>
        )}
      </div>
    </GlassCard>
  );
}
