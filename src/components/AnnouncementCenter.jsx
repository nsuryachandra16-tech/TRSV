import React from 'react';
import { Radio, AlertTriangle, Info, Bell } from 'lucide-react';
import GlassCard from './GlassCard';

export default function AnnouncementCenter({ announcements = [] }) {
  return (
    <GlassCard className="flex flex-col h-full overflow-hidden border border-slate-200/50 dark:border-slate-800">
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-2">
          <Radio className="w-4 h-4 text-cyan-500" />
          Statewide Priority Broadcasts
        </h3>
      </div>
      
      <div className="flex-1 overflow-y-auto custom-sidebar-scrollbar p-3 flex flex-col gap-3">
        {announcements.length > 0 ? announcements.map((ann, i) => (
          <div key={i} className={`p-4 rounded-xl border flex flex-col gap-2 relative overflow-hidden transition-all ${ann.priority === 'High' ? 'bg-rose-500/5 border-rose-500/20 hover:border-rose-500/40' : 'bg-slate-50/80 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 hover:border-cyan-500/30'}`}>
            
            {ann.priority === 'High' && <div className="absolute top-0 left-0 w-1 h-full bg-rose-500" />}

            <div className="flex items-start justify-between gap-4 relative z-10">
              <h4 className={`text-sm font-bold leading-tight ${ann.priority === 'High' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-white'}`}>
                {ann.title}
              </h4>
              {ann.priority === 'High' && (
                <span className="shrink-0 flex items-center gap-1 text-[9px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-500 px-2 py-0.5 rounded border border-rose-500/20">
                  <AlertTriangle className="w-3 h-3" /> Priority
                </span>
              )}
            </div>
            
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed relative z-10">
              {ann.content}
            </p>
            
            <div className="flex items-center gap-2 mt-1 relative z-10">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                Authorized By: {ann.author_name || 'State Command'}
              </span>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <span className="text-[9px] text-slate-500 font-mono">
                {new Date(ann.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        )) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60 p-6 text-center">
            <Bell className="w-8 h-8 mb-2" />
            <span className="text-[10px] font-black uppercase tracking-widest">No Active Broadcasts</span>
          </div>
        )}
      </div>
    </GlassCard>
  );
}
