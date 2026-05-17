import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw, AlertTriangle, ShieldAlert } from 'lucide-react';

export default function EmergencyFallback({ isOffline, onRetry }) {
  const [retrying, setRetrying] = useState(false);
  const [count, setCount] = useState(10);

  // Automated reconnect countdown
  useEffect(() => {
    if (!isOffline) return;
    
    const interval = setInterval(() => {
      setCount((prev) => {
        if (prev <= 1) {
          handleRetry();
          return 10;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOffline]);

  const handleRetry = async () => {
    setRetrying(true);
    if (onRetry) {
      await onRetry();
    }
    setTimeout(() => {
      setRetrying(false);
    }, 1000);
  };

  if (!isOffline) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-6 select-none animate-fadeIn">
      <div className="relative w-full max-w-md bg-slate-900/90 border border-rose-500/25 p-8 rounded-3xl shadow-glow-rose flex flex-col items-center text-center overflow-hidden">
        
        {/* Cinematic glow accent */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="p-4 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-full relative z-10 mb-5 animate-pulse">
          <WifiOff className="w-8 h-8" />
        </div>

        <div className="relative z-10 flex flex-col gap-2">
          <div className="inline-flex items-center gap-1.5 self-center px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 text-[10px] font-extrabold uppercase tracking-wider border border-rose-500/20 mb-2">
            <AlertTriangle className="w-3.5 h-3.5" /> Telemetry Failover Activated
          </div>
          
          <h3 className="text-xl font-black text-white uppercase tracking-wider">Operational Node Disconnected</h3>
          <p className="text-xs text-slate-400 leading-relaxed mt-2">
            The command network lost contact with the statewide Neon/Express backend node. 
            All pending data is safely secured locally.
          </p>

          <div className="my-6 px-4 py-3 rounded-xl bg-slate-950/50 border border-slate-800 text-xs text-slate-500 font-mono flex items-center justify-between w-full">
            <span>Automated Reconnect in:</span>
            <span className="text-rose-500 font-bold">{count}s</span>
          </div>

          <button
            onClick={handleRetry}
            disabled={retrying}
            className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-widest transition-all shadow-glow-rose cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${retrying ? 'animate-spin' : ''}`} />
            {retrying ? 'Re-establishing Grid...' : 'Manual Intercept & Reconnect'}
          </button>
        </div>
      </div>
    </div>
  );
}
