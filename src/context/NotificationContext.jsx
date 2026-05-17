import React, { createContext, useContext, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ShieldAlert, Info, CheckCircle2, AlertTriangle, X } from 'lucide-react';

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  // Add a new toast to the stack
  const addNotification = useCallback((message, type = 'info', priority = 'normal') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type, priority }]);

    // Auto-remove after 5 seconds unless it's a critical emergency
    if (priority !== 'critical') {
      setTimeout(() => {
        removeNotification(id);
      }, 5000);
    }
  }, []);

  const removeNotification = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <NotificationContext.Provider value={{ addNotification, removeNotification }}>
      {children}
      
      {/* Global Toast Renderer */}
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[9999] flex flex-col gap-3 pointer-events-none w-full max-w-sm px-4 sm:px-0">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="pointer-events-auto"
            >
              <ToastItem toast={toast} onClose={() => removeNotification(toast.id)} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </NotificationContext.Provider>
  );
}

export const useNotification = () => useContext(NotificationContext);

function ToastItem({ toast, onClose }) {
  const isCritical = toast.priority === 'critical';
  const typeStyles = {
    success: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500',
    warning: 'bg-amber-500/10 border-amber-500/20 text-amber-500',
    error: 'bg-rose-500/10 border-rose-500/20 text-rose-500',
    info: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-500',
  };

  const Icon = toast.type === 'success' ? CheckCircle2 :
               toast.type === 'error' ? AlertTriangle :
               toast.type === 'warning' ? ShieldAlert : Info;

  return (
    <div className={`p-4 rounded-2xl border backdrop-blur-md shadow-premium-dark flex gap-4 relative overflow-hidden group ${isCritical ? 'bg-rose-950/90 border-rose-500 shadow-glow-rose' : 'bg-slate-900/90 dark:bg-slate-900/90'} ${typeStyles[toast.type] || typeStyles.info}`}>
      {isCritical && <div className="absolute inset-0 bg-rose-500/10 animate-pulse pointer-events-none" />}
      
      <div className="shrink-0 mt-0.5 relative z-10">
        <Icon className={`w-5 h-5 ${isCritical ? 'text-rose-500' : ''}`} />
      </div>
      
      <div className="flex flex-col min-w-0 flex-1 relative z-10">
        {isCritical && (
          <span className="text-[9px] font-black uppercase tracking-widest text-rose-500 mb-1">Statewide Critical Alert</span>
        )}
        <p className={`text-sm font-semibold leading-tight ${isCritical ? 'text-white' : 'text-slate-200'}`}>
          {toast.message}
        </p>
      </div>

      <button onClick={onClose} className="shrink-0 p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors self-start relative z-10">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
