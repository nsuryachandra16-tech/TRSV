import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Search, 
  RefreshCw, 
  SlidersHorizontal, 
  User, 
  Clock, 
  Terminal, 
  Copy, 
  Check, 
  ChevronRight, 
  Filter,
  AlertTriangle,
  Play,
  Pause
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SystemLogs() {
  const [logs, setLogs] = useState([]);
  const [activityTypes, setActivityTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [limit, setLimit] = useState(200);
  
  // Auto refresh configuration
  const [refreshInterval, setRefreshInterval] = useState(10); // in seconds
  const [isPaused, setIsPaused] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [activeLogDetail, setActiveLogDetail] = useState(null);

  const fetchLogs = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const token = localStorage.getItem('trsv_session_token');
      if (!token) return;
      
      const queryParams = new URLSearchParams({
        limit: limit.toString(),
        ...(searchTerm && { search: searchTerm }),
        ...(selectedType && { type: selectedType })
      });

      const res = await fetch(`/api/dashboards/logs?${queryParams}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (data.success) {
        setLogs(data.logs || []);
        setActivityTypes(data.activityTypes || []);
        setError('');
      } else {
        setError(data.message || 'Failed to sync logs.');
      }
    } catch (err) {
      console.error(err);
      setError('Connection failure: Unable to communicate with the logging node.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [selectedType, limit]);

  // Debounced search effect
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchLogs();
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  // Auto polling effect
  useEffect(() => {
    if (isPaused || refreshInterval <= 0) return;
    
    const interval = setInterval(() => {
      fetchLogs(true);
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [refreshInterval, isPaused, searchTerm, selectedType, limit]);

  const handleCopy = (log) => {
    const textToCopy = `[${new Date(log.created_at).toLocaleString()}] [${log.activity_type}] By ${log.full_name || 'System'} (${log.email || 'N/A'}): ${log.details}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedId(log.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Color mapper for activity type badges
  const getBadgeStyles = (type) => {
    const normalType = (type || '').toUpperCase();
    if (normalType.includes('DELETE') || normalType.includes('REVOKE') || normalType.includes('DISMISS')) {
      return {
        bg: 'bg-rose-500/10 dark:bg-rose-500/15',
        text: 'text-rose-600 dark:text-rose-400',
        border: 'border-rose-500/20'
      };
    }
    if (normalType.includes('CREATE') || normalType.includes('ASSIGN') || normalType.includes('SIGNUP') || normalType.includes('RAISED')) {
      return {
        bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
        text: 'text-emerald-600 dark:text-emerald-400',
        border: 'border-emerald-500/20'
      };
    }
    if (normalType.includes('LOGIN') || normalType.includes('COMMENT') || normalType.includes('UPDATE_STATUS')) {
      return {
        bg: 'bg-yellow-500/10 dark:bg-yellow-500/15',
        text: 'text-yellow-600 dark:text-yellow-500',
        border: 'border-yellow-500/25'
      };
    }
    return {
      bg: 'bg-purple-500/10 dark:bg-purple-500/15',
      text: 'text-purple-600 dark:text-purple-400',
      border: 'border-purple-500/20'
    };
  };

  // Helper for human-readable role formatting
  const formatRole = (role) => {
    if (!role) return 'Public User';
    return role.toUpperCase().replace('_', ' ');
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 relative z-10 custom-sidebar-scrollbar select-text text-left">
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2.5">
            <Terminal className="w-6 h-6 text-emerald-550 dark:text-emerald-400 animate-pulse" />
            System Security Ledger
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-450 mt-1">
            Real-time decentralized telemetry monitoring of administrative and security events.
          </p>
        </div>
        
        {/* Polling / Refresh Control panel */}
        <div className="flex items-center gap-2.5 self-start md:self-center bg-slate-100/80 dark:bg-slate-900/60 p-1.5 rounded-2xl border border-slate-200/50 dark:border-slate-800/80">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`p-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-1.5 ${
              isPaused 
                ? 'bg-rose-500/15 text-rose-500 hover:bg-rose-500/20' 
                : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
            }`}
          >
            {isPaused ? (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Paused</span>
              </>
            ) : (
              <>
                <Pause className="w-3.5 h-3.5 animate-pulse" />
                <span>Live Feed</span>
              </>
            )}
          </button>
          
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            disabled={isPaused}
            className="bg-transparent text-xs font-extrabold text-slate-600 dark:text-slate-300 border-none outline-none pr-6 pl-1 cursor-pointer disabled:opacity-50"
          >
            <option value={5}>Poll: 5s</option>
            <option value={10}>Poll: 10s</option>
            <option value={30}>Poll: 30s</option>
            <option value={60}>Poll: 60s</option>
          </select>

          <button
            onClick={() => fetchLogs()}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-200/60 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border transition-all duration-200"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Telemetry Stats Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="glass-panel-light dark:glass-panel-dark p-4 rounded-2xl border border-slate-200/50 dark:border-slate-850">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">Telemetry Buffer</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-800 dark:text-white font-mono">{logs.length}</span>
            <span className="text-xs text-slate-450 dark:text-slate-500">entries</span>
          </div>
        </div>
        <div className="glass-panel-light dark:glass-panel-dark p-4 rounded-2xl border border-slate-200/50 dark:border-slate-850">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">Unique Categories</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-yellow-600 dark:text-yellow-500 font-mono">{activityTypes.length}</span>
            <span className="text-xs text-slate-450 dark:text-slate-500">active</span>
          </div>
        </div>
        <div className="glass-panel-light dark:glass-panel-dark p-4 rounded-2xl border border-slate-200/50 dark:border-slate-850">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">Status Feed</span>
          <div className="flex items-center gap-1.5 mt-2">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-ping" />
            <span className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-wider">Sync Active</span>
          </div>
        </div>
        <div className="glass-panel-light dark:glass-panel-dark p-4 rounded-2xl border border-slate-200/50 dark:border-slate-850">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">Logging Engine</span>
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200 uppercase font-mono">NEON POSTGRES</span>
          </div>
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="glass-panel-light dark:glass-panel-dark p-4 rounded-2xl border border-slate-200/50 dark:border-slate-850 mb-6 flex flex-col md:flex-row items-center gap-4">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search details, actor names, emails, or action types..."
            className="w-full bg-slate-100/50 dark:bg-slate-900/40 border border-slate-250 dark:border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm font-medium text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
          />
        </div>
        
        {/* Category selector */}
        <div className="relative w-full md:w-60">
          <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full bg-slate-100/50 dark:bg-slate-900/40 border border-slate-250 dark:border-slate-800 rounded-xl py-2.5 pl-10 pr-8 text-sm font-medium text-slate-800 dark:text-white outline-none cursor-pointer focus:border-emerald-500/50 transition-all appearance-none"
          >
            <option value="">All Action Types</option>
            {activityTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        {/* Limit Selector */}
        <div className="relative w-full md:w-36">
          <SlidersHorizontal className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="w-full bg-slate-100/50 dark:bg-slate-900/40 border border-slate-250 dark:border-slate-800 rounded-xl py-2.5 pl-10 pr-8 text-sm font-medium text-slate-800 dark:text-white outline-none cursor-pointer focus:border-emerald-500/50 transition-all appearance-none"
          >
            <option value={50}>Limit: 50</option>
            <option value={100}>Limit: 100</option>
            <option value={200}>Limit: 200</option>
            <option value={500}>Limit: 500</option>
          </select>
        </div>
      </div>

      {/* Main Logs Table / View */}
      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-450 text-sm font-semibold flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="glass-panel-light dark:glass-panel-dark rounded-2xl border border-slate-200/50 dark:border-slate-850 overflow-hidden shadow-premium-light dark:shadow-premium-dark">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-250 dark:border-slate-850 bg-slate-100/40 dark:bg-slate-900/30">
                <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest w-40">TIMESTAMP</th>
                <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest w-48">ACTION TYPE</th>
                <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest w-64">ACTOR Badges</th>
                <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">EVENT DESCRIPTION</th>
                <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest w-20 text-center">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-slate-850">
              <AnimatePresence initial={false}>
                {logs.length > 0 ? (
                  logs.map((log) => {
                    const badge = getBadgeStyles(log.activity_type);
                    const formattedDate = new Date(log.created_at).toLocaleString('en-IN', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    });
                    
                    return (
                      <motion.tr 
                        key={log.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="hover:bg-slate-100/30 dark:hover:bg-slate-900/10 transition-colors"
                      >
                        {/* Timestamp */}
                        <td className="p-4 align-top font-mono text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="font-extrabold">{formattedDate}</span>
                            <span className="text-[9px] text-slate-400 mt-0.5">UID: {log.user_id ? log.user_id.substring(0, 8) : 'SYSTEM'}</span>
                          </div>
                        </td>

                        {/* Action Badge */}
                        <td className="p-4 align-top">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-extrabold border font-mono tracking-wider ${badge.bg} ${badge.text} ${badge.border}`}>
                            {log.activity_type}
                          </span>
                        </td>

                        {/* Actor Badge */}
                        <td className="p-4 align-top">
                          <div className="flex items-start gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-slate-200/60 dark:bg-slate-800/80 flex items-center justify-center border text-slate-500 dark:text-slate-400 shrink-0">
                              <User className="w-4 h-4" />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                                {log.full_name || 'System Node'}
                              </span>
                              <span className="text-[10px] text-slate-450 dark:text-slate-450 truncate">
                                {log.email || 'admin@trsv.gov.in'}
                              </span>
                              <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 tracking-wider mt-0.5 uppercase">
                                {formatRole(log.role)}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Description */}
                        <td className="p-4 align-top text-xs text-slate-700 dark:text-slate-250 font-mono leading-relaxed break-all">
                          {log.details}
                        </td>

                        {/* Clipboard Action */}
                        <td className="p-4 align-top text-center">
                          <button
                            onClick={() => handleCopy(log)}
                            className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800/80 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-colors inline-flex justify-center"
                          >
                            {copiedId === log.id ? (
                              <Check className="w-4 h-4 text-green-500" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                      </motion.tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-xs font-semibold text-slate-400 dark:text-slate-500 font-mono">
                      {loading ? 'Dispersing secure sub-threads and fetching telemetry...' : 'No telemetry matches found in current ledger scan.'}
                    </td>
                  </tr>
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
