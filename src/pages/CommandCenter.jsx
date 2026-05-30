import React, { useState, useEffect } from 'react';
import { 
  Radio, 
  ShieldAlert, 
  Cpu, 
  Server, 
  Activity, 
  ArrowRight, 
  ShieldCheck, 
  Plus, 
  Trash2, 
  UserCheck, 
  MapPin, 
  Building, 
  Check, 
  X,
  AlertTriangle,
  Users
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSearchParams } from 'react-router-dom';
import PremiumButton from '../components/PremiumButton';
import GlassCard from '../components/GlassCard';
import RealtimeActivityFeed from '../components/RealtimeActivityFeed';
import { TrendChart, CategoryPieChart } from '../components/RechartsWidgets';
import EmergencyFallback from '../components/EmergencyFallback';
import ComplaintFilters from '../components/ComplaintFilters';
import ComplaintDetailsModal from '../components/ComplaintDetailsModal';

export default function CommandCenter() {
  const { userProfile } = useAuth();
  const [searchParams] = useSearchParams();
  const openTicketId = searchParams.get('open_ticket_id');
  const [activeTab, setActiveTab] = useState('telemetry'); // 'telemetry', 'nodes', 'promotions'

  const [stats, setStats] = useState({
    totalUsers: 0,
    totalLeaders: 0,
    totalConstituencies: 0,
    totalColleges: 0,
    totalComplaints: 0,
    resolvedComplaints: 0,
    criticalComplaints: 0,
    systemLogs: []
  });
  // Tab 1: Live telemetry state
  const [liveFeeds, setLiveFeeds] = useState([]);
  const [trends, setTrends] = useState([]);
  const [categories, setCategories] = useState([]);

  // Tab 2: Constituencies and Colleges state
  const [constituencies, setConstituencies] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [selectedConId, setSelectedConId] = useState('');
  
  // Form variables
  const [newConName, setNewConName] = useState('');
  const [newConDistrict, setNewConDistrict] = useState('');
  const [newCollegeName, setNewCollegeName] = useState('');
  const [newCollegeCode, setNewCollegeCode] = useState('');

  // Tab 3: Promotion state
  const [promoUserId, setPromoUserId] = useState('');
  const [promoRole, setPromoRole] = useState('secretary');
  const [promoConId, setPromoConId] = useState('');
  const [promoColId, setPromoColId] = useState('');
  const [allUsers, setAllUsers] = useState([]);

  // Tab 4: Join requests state
  const [joinRequests, setJoinRequests] = useState([]);
  const [fetchingRequests, setFetchingRequests] = useState(false);

  // Tab 5: Complaint Operations queue states
  const [allComplaints, setAllComplaints] = useState([]);
  const [filteredComplaints, setFilteredComplaints] = useState([]);
  const [selectedTicketId, setSelectedTicketId] = useState(null);

  useEffect(() => {
    if (openTicketId) {
      setSelectedTicketId(parseInt(openTicketId));
      setActiveTab('complaints');
    }
  }, [openTicketId]);

  const [loadingComplaints, setLoadingComplaints] = useState(false);
  const [complaintFilters, setComplaintFilters] = useState({
    search: '',
    category: 'all',
    status: 'all',
    urgency: 'all',
    constituency: 'all'
  });

  const fetchAllComplaints = async () => {
    setLoadingComplaints(true);
    try {
      const token = localStorage.getItem('trsv_session_token');
      const res = await fetch('/api/complaints', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setAllComplaints(data.complaints || []);
        setFilteredComplaints(data.complaints || []);
      }
    } catch (err) {
      console.error('Failed to load all complaints:', err);
    } finally {
      setLoadingComplaints(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'complaints') {
      fetchAllComplaints();
    }
  }, [activeTab]);

  useEffect(() => {
    let result = [...allComplaints];
    
    if (complaintFilters.search) {
      const q = complaintFilters.search.toLowerCase();
      result = result.filter(c => 
        c.title?.toLowerCase().includes(q) || 
        c.description?.toLowerCase().includes(q) ||
        c.id?.toString().includes(q) ||
        c.student_name?.toLowerCase().includes(q)
      );
    }

    if (complaintFilters.category && complaintFilters.category !== 'all') {
      result = result.filter(c => c.category === complaintFilters.category);
    }

    if (complaintFilters.status && complaintFilters.status !== 'all') {
      result = result.filter(c => c.status === complaintFilters.status);
    }

    if (complaintFilters.urgency && complaintFilters.urgency !== 'all') {
      result = result.filter(c => c.urgency?.toLowerCase() === complaintFilters.urgency?.toLowerCase());
    }

    if (complaintFilters.constituency && complaintFilters.constituency !== 'all') {
      result = result.filter(c => c.constituency_id?.toString() === complaintFilters.constituency?.toString());
    }

    setFilteredComplaints(result);
  }, [allComplaints, complaintFilters]);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [connectionDropped, setConnectionDropped] = useState(false);

  // Fetch live operational feeds and analytics
  useEffect(() => {
    if (activeTab !== 'telemetry') return;
    
    const fetchTelemetry = async () => {
      try {
        const token = localStorage.getItem('trsv_session_token');
        const headers = { 'Authorization': `Bearer ${token}` };
        
        const [feedRes, trendRes, catRes] = await Promise.all([
          fetch('/api/transparency/activity'),
          fetch('/api/analytics/trends', { headers }),
          fetch('/api/analytics/categories', { headers })
        ]);
        
        const feedData = await feedRes.json();
        const trendData = await trendRes.json();
        const catData = await catRes.json();
        
        if (feedData.success) {
          // Map complaints to the format RealtimeActivityFeed expects
          const mapped = feedData.activity.map(a => ({
            event_type: a.category + '_Dispute',
            event_message: `Ticket #${a.id} status updated to ${a.status} in ${a.constituency_name || 'State'}`,
            severity: a.status === 'Resolved' ? 'success' : a.status === 'Under Investigation' ? 'warning' : 'info',
            created_at: a.updated_at
          }));
          setLiveFeeds(mapped);
        }
        if (trendData.success) setTrends(trendData.data);
        if (catData.success) setCategories(catData.data);
        setConnectionDropped(false);
      } catch (err) {
        console.error('Failed telemetry fetch:', err);
        setConnectionDropped(true);
      }
    };

    fetchTelemetry();
    
    // Connect to Enterprise Realtime SSE Stream
    const token = localStorage.getItem('trsv_session_token');
    const base = window.Capacitor ? 'https://trsv-union.onrender.com' : '';
    const eventSource = new EventSource(`${base}/api/realtime/stream?token=${token}`);
    eventSource.onopen = () => {
      setConnectionDropped(false);
    };
    eventSource.onerror = () => {
      setConnectionDropped(true);
    };
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'EMERGENCY_ACKNOWLEDGED' || data.type === 'NEW_COMPLAINT') {
          // Instantly refresh the feed if critical governance actions occur
          fetchTelemetry();
        }
      } catch (e) {
        console.error('SSE Parse Error', e);
      }
    };

    return () => {
      eventSource.close();
    };
  }, [activeTab]);

  // Load constituencies, colleges, and users
  const loadData = async () => {
    try {
      const conRes = await fetch('/api/constituencies');
      const conData = await conRes.json();
      if (conData.success) {
        setConstituencies(conData.constituencies);
        if (conData.constituencies.length > 0) {
          setSelectedConId(conData.constituencies[0].id.toString());
          setPromoConId(conData.constituencies[0].id.toString());
        }
      }

      // Load all colleges
      const colRes = await fetch('/api/colleges');
      const colData = await colRes.json();
      if (colData.success) {
        setColleges(colData.colleges);
      }

      const token = localStorage.getItem('trsv_session_token');

      // Load general stats
      const statsRes = await fetch('/api/dashboards/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const statsData = await statsRes.json();
      if (statsData.success) {
        setStats(statsData.stats);
      }

      // Load users list for promotion dropdown selection
      const usersRes = await fetch('/api/dashboards/eligible-users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const usersData = await usersRes.json();
      if (usersData.success) {
        setAllUsers(usersData.users);
        if (usersData.users.length > 0) {
          setPromoUserId(usersData.users[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load command database metrics:', err);
    }
  };

  const fetchJoinRequests = async () => {
    setFetchingRequests(true);
    try {
      const token = localStorage.getItem('trsv_session_token');
      const res = await fetch('/api/join-trsv', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setJoinRequests(data.requests || []);
      }
    } catch (err) {
      console.error('Failed to fetch join requests:', err);
    } finally {
      setFetchingRequests(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'applications') {
      fetchJoinRequests();
    }
  }, [activeTab]);

  const handleUpdateRequestStatus = async (id, status) => {
    try {
      const token = localStorage.getItem('trsv_session_token');
      const res = await fetch(`/api/join-trsv/${id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ text: `Application ${status === 'Approved' ? 'approved' : 'rejected'} successfully.`, type: 'success' });
        fetchJoinRequests();
      } else {
        setMessage({ text: data.message || 'Failed to update application status.', type: 'error' });
      }
    } catch (err) {
      setMessage({ text: 'Network failure updating application.', type: 'error' });
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter colleges based on constituency selection
  const filteredColleges = colleges.filter(col => col.constituency_id.toString() === selectedConId);
  const promoFilteredColleges = colleges.filter(col => col.constituency_id.toString() === promoConId);

  // Trigger college select mapping update on general selection
  useEffect(() => {
    if (promoFilteredColleges.length > 0) {
      setPromoColId(promoFilteredColleges[0].id.toString());
    } else {
      setPromoColId('');
    }
  }, [promoConId, colleges]);

  // Add Constituency handler
  const handleAddConstituency = async (e) => {
    e.preventDefault();
    if (!newConName || !newConDistrict) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('trsv_session_token');
      const res = await fetch('/api/constituencies', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ constituency_name: newConName, district: newConDistrict })
      });
      const data = await res.json();
      if (data.success) {
        setNewConName('');
        setNewConDistrict('');
        setMessage({ text: 'Constituency added successfully to central state grid.', type: 'success' });
        await loadData();
      } else {
        setMessage({ text: data.message || 'Failed to add constituency.', type: 'error' });
      }
    } catch (err) {
      setMessage({ text: 'Network failure during constituency injection.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Add College handler
  const handleAddCollege = async (e) => {
    e.preventDefault();
    if (!newCollegeName || !newCollegeCode || !selectedConId) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('trsv_session_token');
      const res = await fetch('/api/colleges', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          college_name: newCollegeName, 
          college_code: newCollegeCode, 
          constituency_id: parseInt(selectedConId) 
        })
      });
      const data = await res.json();
      if (data.success) {
        setNewCollegeName('');
        setNewCollegeCode('');
        setMessage({ text: 'Campus Node registered and secured successfully.', type: 'success' });
        await loadData();
      } else {
        setMessage({ text: data.message || 'Failed to add college Node.', type: 'error' });
      }
    } catch (err) {
      setMessage({ text: 'Network failure during college node registration.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Promotion handler
  const handlePromote = async (e) => {
    e.preventDefault();
    if (!promoUserId || !promoRole) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('trsv_session_token');
      const res = await fetch('/api/dashboards/promote', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: promoUserId,
          role: promoRole,
          constituencyId: promoConId ? parseInt(promoConId) : null,
          collegeId: promoColId ? parseInt(promoColId) : null
        })
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ text: 'Representative promoted and coordinate keys calibrated.', type: 'success' });
        await loadData();
      } else {
        setMessage({ text: data.message || 'Failed to promote representative.', type: 'error' });
      }
    } catch (err) {
      setMessage({ text: 'Network failure during representative promotion.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 text-left select-none animate-fadeIn">
      
      {/* 1. Supreme Commander Greeting Header */}
      <div className="relative overflow-hidden rounded-2xl glass-panel-light dark:glass-panel-dark border border-slate-200/50 dark:border-slate-850 p-8 shadow-premium-light dark:shadow-premium-dark flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-rose-500/10 to-transparent blur-xl pointer-events-none" />
        
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-500 to-cyan-500 flex items-center justify-center text-white animate-pulse shadow-[0_0_20px_rgba(244,63,94,0.3)] shrink-0">
            <Radio className="w-7 h-7" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 self-start px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-500 text-[10px] font-extrabold uppercase tracking-wider border border-cyan-500/20 animate-pulse mb-1.5">
              SUPREME ADMISSION TELEMETRY ACTIVE
            </div>
            
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-850 dark:text-white flex flex-wrap items-center gap-x-2 gap-y-1">
              Welcome, {userProfile?.full_name || 'Supreme Leader'} <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">|</span> <span className="text-gradient-cyan block sm:inline">Supreme Commander</span>
            </h2>
            
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-xl leading-relaxed">
              Synchronizing state protection parameters, regional telemetry keys, and rapid incident response squad logs in real-time.
            </p>
          </div>
        </div>

        <div className="shrink-0 self-start lg:self-center">
          <div className="flex flex-wrap gap-2">
            {['telemetry', 'complaints', 'nodes', 'promotions', 'applications'].map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setMessage({ text: '', type: '' });
                }}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all capitalize border ${
                  activeTab === tab
                    ? 'bg-rose-500 border-rose-500 text-white shadow-glow-cyan'
                    : 'bg-slate-100/50 dark:bg-slate-900/60 border-slate-200/50 dark:border-slate-800 text-slate-500 hover:text-slate-850 dark:hover:text-white'
                }`}
              >
                {tab === 'nodes' ? 'Academic Grid' : tab === 'applications' ? 'Join Requests' : tab === 'complaints' ? 'Complaints' : tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Dynamic Feedback Alert banner */}
      {message.text && (
        <div className={`p-4 rounded-xl border flex items-center gap-3 text-xs ${
          message.type === 'success' 
            ? 'bg-green-500/10 text-green-500 border-green-500/20' 
            : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
        }`}>
          {message.type === 'success' ? <ShieldCheck className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
          <span>{message.text}</span>
          <button onClick={() => setMessage({ text: '', type: '' })} className="ml-auto hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tab views dispatching area */}
      {activeTab === 'telemetry' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full items-stretch animate-scaleUp">
          <div className="flex flex-col gap-6 lg:col-span-1">
            <div className="p-6 flex flex-col gap-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-premium-light dark:shadow-premium-dark">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <span className="font-extrabold text-sm text-slate-700 dark:text-white uppercase tracking-wider">Server Infrastructure</span>
                <Server className="w-4 h-4 text-cyan-500" />
              </div>
              <div className="flex flex-col gap-3.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Neon DB Cluster</span>
                  <span className="text-green-500 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    Active (8ms)
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Firebase Token Validator</span>
                  <span className="text-green-500 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    Secure (JWT-256)
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Active Coordinator Grids</span>
                  <span className="text-green-500 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    Responsive
                  </span>
                </div>
                <div className="h-[1px] bg-slate-200/40 dark:bg-slate-850/80 my-1" />
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Registered Users</span>
                  <strong className="text-slate-750 dark:text-slate-200">{stats.totalUsers}</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Active Leaders</span>
                  <strong className="text-slate-750 dark:text-slate-200">{stats.totalLeaders}</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Active Complaints</span>
                  <strong className="text-slate-750 dark:text-slate-200">{stats.totalComplaints - stats.resolvedComplaints}</strong>
                </div>
              </div>
            </div>

            <div className="p-6 flex flex-col gap-4 border-l-2 border-rose-500 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-premium-light dark:shadow-premium-dark">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <span className="font-extrabold text-sm text-slate-700 dark:text-white uppercase tracking-wider">Emergency Dispatches</span>
                <ShieldAlert className="w-4 h-4 text-rose-500 animate-pulse" />
              </div>
              <div className="flex items-baseline gap-2 py-2">
                <span className="text-3xl font-black text-rose-500">{stats.criticalComplaints}</span>
                <span className="text-xs font-semibold text-slate-400">Active Campus Alarms</span>
              </div>
              <p className="text-[11px] text-slate-550 dark:text-slate-500 leading-relaxed">
                {stats.criticalComplaints > 0 
                  ? `${stats.criticalComplaints} critical anti-ragging alarms currently escalated in the state grid. Immediate mobilization required.`
                  : "No anti-ragging panic signals detected from any of the connected campus coordinate portals."}
              </p>
            </div>
            
            <EmergencyFallback 
              isOffline={connectionDropped} 
              onRetry={async () => {
                try {
                  await fetch('/api/health');
                  setConnectionDropped(false);
                  loadData();
                } catch (e) {
                  console.warn('Re-connect attempt failed');
                }
              }} 
            />
          </div>

          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="h-[320px] min-w-0 overflow-hidden">
              <div className="p-4 h-full flex flex-col gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-premium-light dark:shadow-premium-dark">
                <span className="font-extrabold text-xs text-slate-700 dark:text-white uppercase tracking-wider pl-2 shrink-0">Statewide Incident Velocity (30 Days)</span>
                <div className="flex-1 min-h-0 min-w-0 overflow-hidden">
                  <TrendChart data={trends} />
                </div>
              </div>
            </div>
            
            <div>
              <RealtimeActivityFeed activities={liveFeeds} />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'nodes' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full items-start animate-scaleUp">
          {/* Mapped regional constituencies list & inject form */}
          <div className="p-6 flex flex-col gap-4 text-left rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-premium-light dark:shadow-premium-dark">
            <h3 className="font-extrabold text-sm text-slate-700 dark:text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
              <MapPin className="w-4 h-4 text-cyan-500" />
              Telangana Constituency Registry
            </h3>

            <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1 custom-sidebar-scrollbar">
              {constituencies.map(con => (
                <div key={con.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-100/50 dark:bg-slate-900/40 border border-slate-200/30 dark:border-slate-850 text-xs">
                  <div>
                    <strong className="text-slate-800 dark:text-white block">{con.constituency_name}</strong>
                    <span className="text-slate-400">{con.district} District • Node ID #{con.id}</span>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddConstituency} className="flex flex-col gap-3.5 border-t border-slate-200 dark:border-slate-800 pt-4 mt-1">
              <span className="text-[10px] font-black text-slate-450 uppercase tracking-widest block">Inject Constituency Node</span>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  placeholder="Kukatpally Constituency"
                  value={newConName}
                  onChange={(e) => setNewConName(e.target.value)}
                  className="p-3 rounded-xl border bg-slate-50 dark:bg-slate-950 text-xs focus:outline-none focus:border-cyan-400 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                />
                <input
                  type="text"
                  required
                  placeholder="Medchal-Malkajgiri"
                  value={newConDistrict}
                  onChange={(e) => setNewConDistrict(e.target.value)}
                  className="p-3 rounded-xl border bg-slate-50 dark:bg-slate-950 text-xs focus:outline-none focus:border-cyan-400 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                />
              </div>
              <PremiumButton type="submit" variant="primary" size="sm" className="w-full" disabled={loading}>
                Inject Constituency Node
              </PremiumButton>
            </form>
          </div>

          {/* Mapped academic campuses list & inject form */}
          <div className="p-6 flex flex-col gap-4 text-left rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-premium-light dark:shadow-premium-dark">
            <h3 className="font-extrabold text-sm text-slate-700 dark:text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
              <Building className="w-4 h-4 text-cyan-500" />
              Academic Campus Nodes (Colleges)
            </h3>

            <div className="flex flex-col gap-3.5 text-xs">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Select Constituency Territory</label>
                <select
                  value={selectedConId}
                  onChange={(e) => setSelectedConId(e.target.value)}
                  className="p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-955 text-xs focus:outline-none focus:border-cyan-400 border-slate-200 dark:border-slate-800 text-slate-850 dark:text-slate-100"
                >
                  {constituencies.map(con => (
                    <option key={con.id} value={con.id}>{con.constituency_name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2 max-h-[150px] overflow-y-auto pr-1 custom-sidebar-scrollbar my-1">
                {filteredColleges.length > 0 ? (
                  filteredColleges.map(col => (
                    <div key={col.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-100/50 dark:bg-slate-900/40 border border-slate-200/30 dark:border-slate-850 text-xs">
                      <div>
                        <strong className="text-slate-800 dark:text-white block">{col.college_name}</strong>
                        <span className="text-slate-400">Campus Code: {col.college_code} • ID #{col.id}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center text-slate-400 text-xs italic">
                    No colleges listed in this constituency territory yet. Add one below!
                  </div>
                )}
              </div>
            </div>

            <form onSubmit={handleAddCollege} className="flex flex-col gap-3.5 border-t border-slate-200 dark:border-slate-800 pt-4 mt-1">
              <span className="text-[10px] font-black text-slate-450 uppercase tracking-widest block">Inject Campus Academic Node</span>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  placeholder="JNTU Hyderabad"
                  value={newCollegeName}
                  onChange={(e) => setNewCollegeName(e.target.value)}
                  className="p-3 rounded-xl border bg-slate-50 dark:bg-slate-955 text-xs focus:outline-none focus:border-cyan-400 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                />
                <input
                  type="text"
                  required
                  placeholder="JNTUH-99"
                  value={newCollegeCode}
                  onChange={(e) => setNewCollegeCode(e.target.value)}
                  className="p-3 rounded-xl border bg-slate-50 dark:bg-slate-955 text-xs focus:outline-none focus:border-cyan-400 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                />
              </div>
              <PremiumButton type="submit" variant="primary" size="sm" className="w-full" disabled={loading}>
                Inject Campus Academic Node
              </PremiumButton>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'promotions' && (
        <div className="w-full max-w-2xl mx-auto animate-scaleUp">
          <GlassCard hoverEffect={false} className="p-8 flex flex-col gap-6 text-left">
            <h3 className="font-extrabold text-sm text-slate-700 dark:text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-200/50 dark:border-slate-850 pb-4">
              <UserCheck className="w-5 h-5 text-cyan-500" />
              Coordinator Promotion Grid
            </h3>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed bg-slate-100/50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200/40 dark:border-slate-850">
              Select any registered student representative profile from the network and calibrate their state administrative coordinates, authorizing specific local campus or constituency complaint dispatch permissions.
            </p>

            <form onSubmit={handlePromote} className="flex flex-col gap-5">
                         {/* Select student to promote */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Select Registered Coordinator Profile</label>
                <select
                  value={promoUserId}
                  onChange={(e) => setPromoUserId(e.target.value)}
                  className="w-full p-3 rounded-xl border bg-slate-50 dark:bg-slate-950 text-xs focus:outline-none focus:border-cyan-400 border-slate-200 dark:border-slate-800 text-slate-850 dark:text-slate-100"
                >
                  {allUsers.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.full_name} ({user.email}) - Current Rank: [{user.role}]
                    </option>
                  ))}
                </select>
              </div>

              {/* Roles Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Target Leader Command Rank</label>
                  <select
                    value={promoRole}
                    onChange={(e) => setPromoRole(e.target.value)}
                    className="w-full p-3 rounded-xl border bg-slate-50 dark:bg-slate-950 text-xs focus:outline-none focus:border-cyan-400 border-slate-200 dark:border-slate-800 text-slate-855 dark:text-slate-100"
                  >
                    <option value="secretary">Campus Secretary</option>
                    <option value="general_secretary">General Secretary</option>
                    <option value="vice_president">Vice President</option>
                    <option value="president">State President</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Map Constituency Territory</label>
                  <select
                    value={promoConId}
                    onChange={(e) => setPromoConId(e.target.value)}
                    className="w-full p-3 rounded-xl border bg-slate-50 dark:bg-slate-950 text-xs focus:outline-none focus:border-cyan-400 border-slate-200 dark:border-slate-800 text-slate-850 dark:text-slate-100"
                  >
                    {constituencies.map(con => (
                      <option key={con.id} value={con.id}>{con.constituency_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Map specific college node (only for Campus Secretary rank) */}
              {promoRole === 'secretary' && (
                <div className="flex flex-col gap-1.5 animate-scaleUp">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Map Campus Academic Node</label>
                  <select
                    value={promoColId}
                    onChange={(e) => setPromoColId(e.target.value)}
                    disabled={promoFilteredColleges.length === 0}
                    className="w-full p-3 rounded-xl border bg-slate-50 dark:bg-slate-955 text-xs focus:outline-none focus:border-cyan-400 border-slate-200 dark:border-slate-800 text-slate-850 dark:text-slate-100 disabled:opacity-50"
                  >
                    {promoFilteredColleges.length > 0 ? (
                      promoFilteredColleges.map(col => (
                        <option key={col.id} value={col.id}>{col.college_name}</option>
                      ))
                    ) : (
                      <option value="">No Colleges listed in selected territory</option>
                    )}
                  </select>
                </div>
              )}

              <PremiumButton type="submit" variant="primary" size="md" className="w-full mt-2" disabled={loading}>
                {loading ? 'Recalibrating Security Perms...' : 'Promote Representative & Assign Coordinates'}
              </PremiumButton>

            </form>
          </GlassCard>
        </div>
      )}

      {activeTab === 'applications' && (
        <div className="w-full flex flex-col gap-6 animate-scaleUp">
          <div className="p-6 flex flex-col gap-4 text-left rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-premium-light dark:shadow-premium-dark">
            <h3 className="font-extrabold text-sm text-slate-700 dark:text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
              <Users className="w-4 h-4 text-cyan-500" />
              Join TRSV Requests
            </h3>

            {fetchingRequests ? (
              <div className="py-12 text-center text-xs text-slate-400 dark:text-slate-550 italic">
                Loading applications network node...
              </div>
            ) : joinRequests.length > 0 ? (
              <div className="flex flex-col gap-4">
                {joinRequests.map((req) => (
                  <div key={req.id} className="p-4 sm:p-5 rounded-2xl bg-slate-50/50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-850 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fadeIn">
                    <div className="flex flex-col gap-1.5 text-xs text-slate-500">
                      <div className="flex items-center gap-2">
                        <strong className="text-sm font-bold text-slate-800 dark:text-white">{req.full_name}</strong>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold ${
                          req.status === 'Approved'
                            ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                            : req.status === 'Rejected'
                            ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                            : 'bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse'
                        }`}>
                          {req.status}
                        </span>
                      </div>
                      <p className="mt-0.5">Email: <span className="text-slate-700 dark:text-slate-350">{req.email}</span> | Phone: <span className="text-slate-700 dark:text-slate-350">{req.phone}</span></p>
                       <p>Constituency Area: <span className="text-slate-750 dark:text-slate-300 font-semibold">{req.constituency_name || 'Not Registered'} ({req.district || ''})</span></p>
                      <div className="mt-1 bg-slate-100/50 dark:bg-slate-950/40 p-2.5 rounded-lg border border-slate-200/30 dark:border-slate-850 text-slate-600 dark:text-slate-400">
                        <span className="font-extrabold text-[10px] text-slate-450 dark:text-slate-500 uppercase block mb-1">Statement of Motivation</span>
                        {req.reason}
                      </div>
                      <span className="text-[9px] text-slate-400 mt-1 block">Applied: {new Date(req.created_at).toLocaleString()}</span>
                    </div>

                    {req.status === 'Pending' && (
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <button
                          onClick={() => handleUpdateRequestStatus(req.id, 'Approved')}
                          className="inline-flex items-center justify-center font-bold rounded-xl transition-all duration-300 active:scale-95 px-4 py-2 text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-md border border-emerald-500/20 gap-1.5 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Approve
                        </button>
                        <PremiumButton
                          variant="secondary"
                          size="sm"
                          onClick={() => handleUpdateRequestStatus(req.id, 'Rejected')}
                          icon={<X className="w-3.5 h-3.5" />}
                          className="border-rose-500/30 text-rose-500 hover:bg-rose-500/10"
                        >
                          Reject
                        </PremiumButton>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 text-xs italic">
                No active join requests found.
              </div>
            )}
          </div>
        </div>
      )}
      {activeTab === 'complaints' && (
        <div className="w-full flex flex-col gap-6 animate-scaleUp">
          <ComplaintFilters 
            onFilterChange={setComplaintFilters} 
            constituencies={constituencies} 
          />

          <div className="p-6 flex flex-col gap-4 text-left rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-premium-light dark:shadow-premium-dark">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <span className="font-extrabold text-sm text-slate-700 dark:text-white uppercase tracking-wider">
                Complaint Operations Queue ({filteredComplaints.length})
              </span>
              <span className="text-xs text-slate-400">Total {allComplaints.length} Lodged</span>
            </div>

            {loadingComplaints ? (
              <div className="py-12 text-center text-xs text-slate-405 italic">
                Synchronizing ticket logs...
              </div>
            ) : filteredComplaints.length > 0 ? (
              <div className="overflow-x-auto w-full">
                <table className="w-full text-xs text-left divide-y divide-slate-200/50 dark:divide-slate-800">
                  <thead>
                    <tr className="text-slate-450 uppercase font-black tracking-wider bg-slate-50 dark:bg-slate-850">
                      <th className="px-4 py-3">Ticket ID</th>
                      <th className="px-4 py-3">Student Name</th>
                      <th className="px-4 py-3">Incident Title</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Constituency</th>
                      <th className="px-4 py-3">Urgency</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-850/50">
                    {filteredComplaints.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                        <td className="px-4 py-3.5 font-mono text-cyan-500 font-bold">#{c.id}</td>
                        <td className="px-4 py-3.5 font-bold text-slate-800 dark:text-white">{c.student_name}</td>
                        <td className="px-4 py-3.5 max-w-[200px] truncate text-slate-650 dark:text-slate-300 font-medium" title={c.title}>{c.title}</td>
                        <td className="px-4 py-3.5 font-semibold text-slate-700 dark:text-slate-350">{c.category}</td>
                        <td className="px-4 py-3.5 text-slate-500">{c.constituency_name || 'State Scope'}</td>
                        <td className="px-4 py-3.5">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase border ${
                            c.urgency?.toLowerCase() === 'critical'
                              ? 'bg-rose-500/10 text-rose-500 border-rose-500/20 shadow-glow-rose'
                              : c.urgency?.toLowerCase() === 'high'
                              ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                              : c.urgency?.toLowerCase() === 'medium'
                              ? 'bg-sky-500/10 text-sky-500 border-sky-500/20'
                              : 'bg-green-500/10 text-green-500 border-green-500/20'
                          }`}>
                            {c.urgency}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
                            {c.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedTicketId(c.id)}
                            className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white font-black uppercase text-[10px] tracking-wider transition-all shadow-glow-cyan cursor-pointer"
                          >
                            Manage
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 text-xs italic">
                No matching complaints found in this constituency query.
              </div>
            )}
          </div>
        </div>
      )}

      {selectedTicketId && (
        <ComplaintDetailsModal 
          ticketId={selectedTicketId} 
          onClose={() => setSelectedTicketId(null)} 
          userProfile={userProfile} 
          onUpdateSuccess={fetchAllComplaints} 
        />
      )}

    </div>
  );
}
