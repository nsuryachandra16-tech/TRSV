import React, { useState, useEffect } from 'react';
import { Shield, Users, Radio, CheckCircle, AlertTriangle, Play, ChevronRight, Phone, RefreshCw, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import GlassCard from '../components/GlassCard';
import PremiumButton from '../components/PremiumButton';
import ComplaintDetailsModal from '../components/ComplaintDetailsModal';
import RealtimeActivityFeed from '../components/RealtimeActivityFeed';
import { CategoryPieChart } from '../components/RechartsWidgets';
import EmergencyFallback from '../components/EmergencyFallback';
import GrievanceFilters from '../components/GrievanceFilters';

export default function LeaderDashboard() {
  const { userProfile } = useAuth();
  const [stats, setStats] = useState({
    totalComplaints: 0,
    pendingComplaints: 0,
    resolvedComplaints: 0,
    collegeNodes: 0,
    resolutionRate: 0,
    activeConstituencies: 0,
    activeColleges: 0
  });

  const [activeQueue, setActiveQueue] = useState([]);
  const [filteredQueue, setFilteredQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [connectionDropped, setConnectionDropped] = useState(false);
  
  const [localCategories, setLocalCategories] = useState([]);
  const [localActivity, setLocalActivity] = useState([]);
  const [constituencyList, setConstituencyList] = useState([]);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('tsrv_session_token');
      
      // 1. Fetch live metrics
      const statsRes = await fetch('/api/dashboards/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const statsData = await statsRes.json();
      if (statsData.success) {
        setStats(statsData.stats);
      }

      // 2. Fetch scoped complaint ticket list
      const complaintsRes = await fetch('/api/complaints', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const complaintsData = await complaintsRes.json();
      if (complaintsData.success) {
        setActiveQueue(complaintsData.complaints);
        setFilteredQueue(complaintsData.complaints);
      }
      
      // Fetch constituencies list for filters
      const conRes = await fetch('/api/constituencies');
      const conData = await conRes.json();
      if (conData.success) {
        setConstituencyList(conData.constituencies);
      }

      // 3. Fetch localized telemetry
      const [catRes, actRes] = await Promise.all([
        fetch('/api/analytics/categories', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/transparency/activity')
      ]);
      const catData = await catRes.json();
      const actData = await actRes.json();
      
      if (catData.success) setLocalCategories(catData.data);
      if (actData.success) {
        // Simple mapping to feed format
        const mapped = actData.activity.map(a => ({
          event_type: a.category + '_Dispute',
          event_message: `Ticket #${a.id} updated in ${a.constituency_name || 'State'}`,
          severity: a.status === 'Resolved' ? 'success' : a.status === 'Under Investigation' ? 'warning' : 'info',
          created_at: a.updated_at
        }));
        setLocalActivity(mapped.slice(0, 8)); // Localized short feed
      }
      setConnectionDropped(false);
    } catch (error) {
      console.error('Failed to load leader operations telemetry:', error.message);
      setConnectionDropped(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Wire up to Enterprise SSE stream
    const eventSource = new EventSource('/api/realtime/stream');
    eventSource.onopen = () => {
      setConnectionDropped(false);
    };
    eventSource.onerror = () => {
      setConnectionDropped(true);
    };
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'NEW_COMPLAINT' || data.type === 'EMERGENCY_ACKNOWLEDGED') {
          fetchDashboardData();
        }
      } catch (err) {
        console.error('SSE Error:', err);
      }
    };

    return () => {
      eventSource.close();
    };
  }, []);



  const getUrgencyColor = (urgency) => {
    const maps = {
      critical: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
      high: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      medium: 'bg-sky-500/10 text-sky-500 border-sky-500/20',
      low: 'bg-green-500/10 text-green-500 border-green-500/20'
    };
    return maps[urgency?.toLowerCase()] || maps.medium;
  };

  // Dynamically resolve stats cards to render based on the logged-in user's role
  const getStatsCards = () => {
    if (userProfile?.role === 'secretary') {
      return [
        { label: 'Campus Total Cases', val: stats.totalComplaints || 0, color: 'text-sky-500' },
        { label: 'Pending Audit', val: stats.pendingComplaints || 0, color: 'text-rose-500' },
        { label: 'Cases Resolved', val: stats.resolvedComplaints || 0, color: 'text-green-500' },
        { label: 'Campus Clear Rate', val: `${stats.resolutionRate || 0}%`, color: 'text-cyan-400' }
      ];
    } else if (userProfile?.role === 'general_secretary') {
      return [
        { label: 'Constituency Grievances', val: stats.totalComplaints || 0, color: 'text-sky-500' },
        { label: 'Active Escaped Reviews', val: stats.pendingComplaints || 0, color: 'text-rose-500 animate-pulse' },
        { label: 'Resolved Telemetries', val: stats.resolvedComplaints || 0, color: 'text-green-500' },
        { label: 'Active Colleges Nodes', val: stats.collegeNodes || 0, color: 'text-cyan-400' }
      ];
    } else {
      // VPs / Presidents
      return [
        { label: 'Statewide Incidents', val: stats.totalComplaints || 0, color: 'text-sky-500' },
        { label: 'Pending Action Reviews', val: stats.pendingComplaints || 0, color: 'text-rose-500' },
        { label: 'Statewide Resolutions', val: stats.resolvedComplaints || 0, color: 'text-green-500' },
        { label: 'Monitored Campuses', val: stats.activeColleges || 0, color: 'text-cyan-400' }
      ];
    }
  };

  const getRoleHeaderLabel = (role) => {
    const roles = {
      secretary: 'Campus Secretary',
      general_secretary: 'General Secretary',
      vice_president: 'Vice President',
      president: 'State President'
    };
    return roles[role] || 'Regional Leader';
  };

  const handleFilterChange = (filters) => {
    let result = [...activeQueue];

    if (filters.search) {
      result = result.filter(item => 
        item.title.toLowerCase().includes(filters.search) || 
        item.id.toString().includes(filters.search) ||
        (item.description && item.description.toLowerCase().includes(filters.search))
      );
    }

    if (filters.category !== 'all') {
      result = result.filter(item => item.category === filters.category);
    }

    if (filters.status !== 'all') {
      result = result.filter(item => item.status === filters.status);
    }

    if (filters.urgency !== 'all') {
      result = result.filter(item => item.urgency?.toLowerCase() === filters.urgency.toLowerCase());
    }

    if (filters.constituency !== 'all') {
      result = result.filter(item => item.constituency_id === parseInt(filters.constituency));
    }

    setFilteredQueue(result);
  };

  return (
    <div className="w-full flex flex-col gap-6 text-left select-none animate-fadeIn relative">
      
      {/* 1. Leadership Greeting Card */}
      <div className="relative overflow-hidden rounded-2xl glass-panel-light dark:glass-panel-dark border border-slate-200/50 dark:border-slate-850 p-8 shadow-premium-light dark:shadow-premium-dark flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-cyan-500/10 to-transparent blur-xl pointer-events-none" />
        
        <div className="flex flex-col gap-2">
          <div className="inline-flex items-center gap-1.5 self-start px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-extrabold uppercase tracking-wider border border-rose-500/20">
            Active Constituency Operations Command
          </div>
          
          <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-850 dark:text-white flex flex-wrap items-center gap-x-2 gap-y-1">
            Welcome, {userProfile?.full_name || 'Leader'} <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">|</span> <span className="text-gradient-cyan block sm:inline">{getRoleHeaderLabel(userProfile?.role)}</span>
          </h2>
          
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-xl leading-relaxed">
            Constituency Node active. Directing operations for <strong>{userProfile?.college_name || userProfile?.constituency_name || 'Telangana District Region'}</strong>. All active cases are fully synchronized.
          </p>
        </div>

        <div className="flex gap-3.5 shrink-0 self-start sm:self-center">
          <a href="tel:+918008887781" className="inline-flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-bold border border-cyan-500/25 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/10 transition-colors shadow-sm">
            <Phone className="w-3.5 h-3.5" />
            Helpline Dispatch
          </a>
        </div>
      </div>

      {/* Advanced Filtering Matrix */}
      <GrievanceFilters 
        onFilterChange={handleFilterChange} 
        constituencies={constituencyList}
      />

      {/* Summary Stats grid */}
      {loading ? (
        <div className="w-full py-6 flex justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-t-cyan-500 border-r-transparent border-slate-850 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full">
          {getStatsCards().map((item, idx) => (
            <GlassCard key={idx} hoverEffect={true} className="p-5 text-center flex flex-col justify-center gap-1.5">
              <span className={`text-2xl sm:text-3xl font-black ${item.color}`}>{item.val}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.label}</span>
            </GlassCard>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch w-full">
        
        {/* District Action Queue */}
        <div className="lg:col-span-2">
          <GlassCard hoverEffect={false} className="p-6 h-full flex flex-col justify-between gap-4 min-h-[400px]">
            <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-850 pb-3">
              <span className="font-extrabold text-sm text-slate-700 dark:text-white uppercase tracking-wider">Grievance Incident Dispatch Queue</span>
              <span className="text-xs text-rose-500 font-extrabold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Action Center
              </span>
            </div>

            {loading ? (
              <div className="py-12 flex justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-t-cyan-500 border-r-transparent border-slate-850 animate-spin" />
              </div>
            ) : (
              <div className="flex flex-col gap-3 my-2 max-h-[350px] overflow-y-auto pr-1 custom-sidebar-scrollbar">
                {filteredQueue.length > 0 ? (
                  filteredQueue.map((item) => (
                    <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-slate-100/50 dark:bg-slate-900/40 border border-slate-200/40 dark:border-slate-850 gap-4">
                      <div className="flex flex-col text-left">
                        <span className="font-bold text-sm text-slate-850 dark:text-white">{item.title}</span>
                        <span className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">
                          {item.college_name || 'Statewide Area'} • Ticket #{item.id} • Student: {item.student_name || 'Anonymous Advocate'}
                        </span>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-1 italic max-w-xl">
                          "{item.description}"
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                        <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${getUrgencyColor(item.urgency)}`}>
                          {item.urgency}
                        </span>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
                          {item.status}
                        </span>
                        <button
                          onClick={() => setSelectedTicketId(item.id)}
                          className="p-2 rounded-xl bg-cyan-500 text-white hover:bg-cyan-600 transition-colors shadow-glow-cyan"
                          title="Evaluate & update status"
                        >
                          <Play className="w-4 h-4 fill-white" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-10 text-center text-slate-400 text-sm">
                    No matching grievances found matching your matrix query filters.
                  </div>
                )}
              </div>
            )}
          </GlassCard>
        </div>

        {/* Localized Analytics & Feed */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="h-[200px]">
            <GlassCard hoverEffect={false} className="p-4 h-full flex flex-col gap-2">
              <span className="font-extrabold text-[10px] text-slate-700 dark:text-white uppercase tracking-wider pl-2 text-center">Category Distribution</span>
              <div className="flex-1 min-h-0">
                <CategoryPieChart data={localCategories} />
              </div>
            </GlassCard>
          </div>
          <div className="flex-1 min-h-[250px]">
            <RealtimeActivityFeed activities={localActivity} title="Local Feeds" />
          </div>
        </div>

      </div>

      {selectedTicketId && (
        <ComplaintDetailsModal 
          ticketId={selectedTicketId} 
          onClose={() => setSelectedTicketId(null)} 
          userProfile={userProfile} 
          onUpdateSuccess={fetchDashboardData}
        />
      )}

      <EmergencyFallback 
        isOffline={connectionDropped} 
        onRetry={async () => {
          try {
            await fetch('/api/health');
            setConnectionDropped(false);
            fetchDashboardData();
          } catch (e) {
            console.warn('Re-connect attempt failed');
          }
        }} 
      />

    </div>
  );
}
