import React, { useState, useEffect } from 'react';
import { Filter, Search, SlidersHorizontal, RefreshCw } from 'lucide-react';

export default function ComplaintFilters({ onFilterChange, constituencies = [], colleges = [] }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  const [urgency, setUrgency] = useState('all');
  const [constituency, setConstituency] = useState('all');

  // Propagate filters up when any selector changes
  useEffect(() => {
    onFilterChange({
      search: search.trim().toLowerCase(),
      category,
      status,
      urgency,
      constituency
    });
  }, [search, category, status, urgency, constituency]);

  const handleReset = () => {
    setSearch('');
    setCategory('all');
    setStatus('all');
    setUrgency('all');
    setConstituency('all');
  };

  return (
    <div className="w-full p-6 rounded-2xl glass-panel-light dark:glass-panel-dark border border-slate-200/50 dark:border-slate-850 shadow-premium-light dark:shadow-premium-dark flex flex-col gap-4 animate-scaleUp text-left">
      
      {/* Filters Header */}
      <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-850 pb-3">
        <span className="font-extrabold text-xs text-slate-700 dark:text-white uppercase tracking-wider flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-cyan-500" />
          Filter Operations Matrix
        </span>
        <button
          onClick={handleReset}
          className="text-[10px] font-black text-rose-500 hover:text-rose-400 uppercase tracking-widest flex items-center gap-1 transition-colors bg-transparent border-none cursor-pointer"
        >
          <RefreshCw className="w-3 h-3" /> Reset Matrix
        </button>
      </div>

      {/* Grid Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        
        {/* Search */}
        <div className="flex flex-col gap-1.5 md:col-span-1">
          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Search Keywords</label>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search title, ticket #..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border bg-white/40 dark:bg-slate-900/40 text-xs focus:outline-none focus:border-cyan-400 border-slate-200/60 dark:border-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-450"
            />
          </div>
        </div>

        {/* Category */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Complaint Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full p-2.5 rounded-xl border bg-white/40 dark:bg-slate-900/40 text-xs focus:outline-none focus:border-cyan-400 border-slate-200/60 dark:border-slate-800 text-slate-800 dark:text-slate-100"
          >
            <option value="all">All Categories</option>
            <option value="Academic">Academic</option>
            <option value="Infrastructure">Infrastructure</option>
            <option value="Ragging">Ragging</option>
            <option value="Facilities">Facilities</option>
            <option value="General">General</option>
          </select>
        </div>

        {/* Status */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Review Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full p-2.5 rounded-xl border bg-white/40 dark:bg-slate-900/40 text-xs focus:outline-none focus:border-cyan-400 border-slate-200/60 dark:border-slate-800 text-slate-800 dark:text-slate-100"
          >
            <option value="all">All Statuses</option>
            <option value="Complaint Registered">Registered</option>
            <option value="Complaint Verified">Verified</option>
            <option value="Solving Started">Solving Started</option>
            <option value="Solved">Solved</option>
            <option value="Dismissed">Dismissed</option>
          </select>
        </div>

        {/* Urgency */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Severity / Urgency</label>
          <select
            value={urgency}
            onChange={(e) => setUrgency(e.target.value)}
            className="w-full p-2.5 rounded-xl border bg-white/40 dark:bg-slate-900/40 text-xs focus:outline-none focus:border-cyan-400 border-slate-200/60 dark:border-slate-800 text-slate-800 dark:text-slate-100"
          >
            <option value="all">All Levels</option>
            <option value="low">Low Priority</option>
            <option value="medium">Medium</option>
            <option value="high">High Urgency</option>
            <option value="critical">State Critical</option>
          </select>
        </div>

        {/* Constituency */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Regional Territory</label>
          <select
            value={constituency}
            onChange={(e) => setConstituency(e.target.value)}
            disabled={constituencies.length === 0}
            className="w-full p-2.5 rounded-xl border bg-white/40 dark:bg-slate-900/40 text-xs focus:outline-none focus:border-cyan-400 border-slate-200/60 dark:border-slate-800 text-slate-800 dark:text-slate-100 disabled:opacity-50"
          >
            <option value="all">All Districts</option>
            {constituencies.map((con) => (
              <option key={con.id} value={con.id}>
                {con.constituency_name}
              </option>
            ))}
          </select>
        </div>

      </div>

    </div>
  );
}
