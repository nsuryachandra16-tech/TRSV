import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, Award, RefreshCw, Trash2, ShieldX, UserCheck, AlertTriangle, Eye, Activity, Search, ShieldCheck as VerifiedBadge } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import PremiumButton from '../components/PremiumButton';
import { useAuth } from '../context/AuthContext';

export default function IdManagement() {
  const { userProfile } = useAuth();
  
  // Data States
  const [members, setMembers] = useState([]);
  const [scanLogs, setScanLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState('');
  
  // Filtering states
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchMembersList = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('tsrv_session_token');
      
      // 1. Fetch all dashboard users
      const response = await fetch('/api/dashboards/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        // Fetch identity details for each user to overlay card status
        const enrichedMembers = await Promise.all(data.users.map(async (u) => {
          try {
            const idRes = await fetch(`/api/identity/verify/${u.id}`);
            const idData = await idRes.json();
            if (idData.success) {
              return { ...u, identity: idData.identity };
            }
          } catch (_) {}
          return { ...u, identity: null };
        }));
        setMembers(enrichedMembers);
      }
    } catch (err) {
      console.error('Failed to load identity roster:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchScanLogs = async () => {
    setLogsLoading(true);
    try {
      const token = localStorage.getItem('tsrv_session_token');
      const response = await fetch('/api/identity/logs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setScanLogs(data.logs);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    fetchMembersList();
    fetchScanLogs();
  }, []);

  const handleProvision = async (targetUserId) => {
    setActionLoading(true);
    setNotification('');
    try {
      const token = localStorage.getItem('tsrv_session_token');
      const response = await fetch('/api/identity/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ targetUserId })
      });
      const data = await response.json();
      if (data.success) {
        setNotification(`✓ Digital ID card provisioned successfully!`);
        fetchMembersList();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateStatus = async (identityId, newStatus) => {
    setActionLoading(true);
    setNotification('');
    try {
      const token = localStorage.getItem('tsrv_session_token');
      const response = await fetch('/api/identity/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ identityId, newStatus })
      });
      const data = await response.json();
      if (data.success) {
        setNotification(`✓ Card status updated to "${newStatus}"!`);
        fetchMembersList();
        fetchScanLogs();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  // Roster Filters
  const filteredMembers = members.filter(m => {
    const matchesSearch = m.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          m.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (m.identity?.tsrv_member_id || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || m.role === roleFilter;
    
    let matchesStatus = true;
    if (statusFilter !== 'all') {
      if (statusFilter === 'unprovisioned') {
        matchesStatus = !m.identity;
      } else {
        matchesStatus = m.identity?.verification_status === statusFilter;
      }
    }

    return matchesSearch && matchesRole && matchesStatus;
  });

  const getStatusBadge = (status) => {
    const maps = {
      Verified: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      Active: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
      Suspended: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      Inactive: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
      Revoked: 'bg-rose-500/10 text-rose-500 border-rose-500/20'
    };
    return maps[status] || 'bg-slate-500/10 text-slate-500 border-slate-500/20';
  };

  return (
    <div className="w-full flex flex-col gap-6 text-left select-none animate-fadeIn">
      
      {/* 1. Header Banner */}
      <div className="relative overflow-hidden rounded-2xl glass-panel-light dark:glass-panel-dark border border-slate-200/50 dark:border-slate-850 p-8 shadow-premium-light dark:shadow-premium-dark flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-cyan-500/10 to-transparent blur-xl pointer-events-none" />
        
        <div className="flex flex-col gap-2">
          <div className="inline-flex items-center gap-1.5 self-start px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 text-[10px] font-extrabold uppercase tracking-wider border border-cyan-500/20">
            Supreme Control Panel
          </div>
          <h2 className="text-3xl font-black text-slate-800 dark:text-white flex items-center gap-2">
            Identity & QR Credentials Console
          </h2>
          <p className="text-xs text-slate-440 dark:text-slate-550 mt-1 max-w-xl leading-relaxed">
            Provision official digital cards, suspend access, revoke active credentials in real-time, and audit scanning telemetry metrics.
          </p>
        </div>

        <div className="flex gap-2">
          <PremiumButton 
            variant="glow" 
            size="sm" 
            onClick={() => { fetchMembersList(); fetchScanLogs(); }}
            icon={<RefreshCw className="w-4 h-4" />}
          >
            Sync Data Node
          </PremiumButton>
        </div>
      </div>

      {notification && (
        <div className="flex items-center gap-2.5 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-550 dark:text-emerald-450 text-xs font-bold animate-[bounceIn_0.3s_ease-out]">
          <span>{notification}</span>
        </div>
      )}

      {/* 2. Main Identity Roster Section */}
      <GlassCard className="p-6 flex flex-col gap-6" hoverEffect={false}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-200/50 dark:border-slate-850 pb-4">
          <h3 className="font-extrabold text-base text-slate-800 dark:text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-cyan-400" />
            Governance Identity Roster
          </h3>

          {/* Roster Filters Toolbar */}
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-60">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search name or member ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200/60 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200/60 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 text-slate-700 dark:text-slate-350 focus:outline-none focus:border-cyan-400"
            >
              <option value="all">All Roles</option>
              <option value="student">Student</option>
              <option value="secretary">Secretary</option>
              <option value="general_secretary">General Secretary</option>
              <option value="vice_president">Vice President</option>
              <option value="president">President</option>
              <option value="supreme_admin">Supreme Admin</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200/60 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 text-slate-700 dark:text-slate-350 focus:outline-none focus:border-cyan-400"
            >
              <option value="all">All Statuses</option>
              <option value="Verified">Verified</option>
              <option value="Active">Active</option>
              <option value="Suspended">Suspended</option>
              <option value="Inactive">Inactive</option>
              <option value="Revoked">Revoked</option>
              <option value="unprovisioned">Unprovisioned</option>
            </select>
          </div>
        </div>

        {/* Datatable */}
        <div className="overflow-x-auto w-full">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/50 dark:border-slate-850 text-slate-450 font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4">Member Node</th>
                <th className="py-3.5 px-4">Role Display</th>
                <th className="py-3.5 px-4">Member ID</th>
                <th className="py-3.5 px-4">Card status</th>
                <th className="py-3.5 px-4 text-right">Interactive Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="text-center py-8 text-slate-450 italic">
                    Loading credentials roster...
                  </td>
                </tr>
              ) : filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-8 text-slate-450 italic">
                    No matching members found.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => (
                  <tr key={member.id} className="border-b border-slate-100/40 dark:border-slate-850/50 hover:bg-slate-50/20 dark:hover:bg-slate-900/10 transition-all duration-150">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        {member.profile_image ? (
                          <img src={member.profile_image} alt={member.full_name} className="w-8 h-8 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-500 to-cyan-400 text-white font-extrabold text-[10px] flex items-center justify-center uppercase shrink-0">
                            {member.full_name.substring(0, 2)}
                          </div>
                        )}
                        <div className="flex flex-col min-w-0">
                          <strong className="text-slate-800 dark:text-slate-200 font-bold truncate max-w-[180px]">{member.full_name}</strong>
                          <span className="text-[9px] text-slate-450 mt-0.5 truncate max-w-[180px]">{member.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 uppercase font-bold text-[9px] tracking-wider text-slate-450">
                      {member.role.replace('_', ' ')}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-800 dark:text-slate-250">
                      {member.identity ? member.identity.tsrv_member_id : '---'}
                    </td>
                    <td className="py-3 px-4">
                      {member.identity ? (
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border uppercase tracking-wider ${getStatusBadge(member.identity.verification_status)}`}>
                          {member.identity.verification_status}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400 italic">Unprovisioned</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {!member.identity ? (
                          <button
                            onClick={() => handleProvision(member.id)}
                            disabled={actionLoading}
                            className="px-2.5 py-1.5 rounded-lg border border-cyan-500/20 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-500 font-bold text-[10px] uppercase transition-all duration-200 cursor-pointer"
                          >
                            Provision Card
                          </button>
                        ) : (
                          <>
                            {/* Activate action */}
                            {member.identity.verification_status !== 'Verified' && member.identity.verification_status !== 'Active' && (
                              <button
                                onClick={() => handleUpdateStatus(member.identity.id, member.verified ? 'Verified' : 'Active')}
                                disabled={actionLoading}
                                className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-500 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                                title="Activate & Reinstate Card"
                              >
                                <ShieldCheck className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Suspend Action */}
                            {member.identity.verification_status !== 'Suspended' && (
                              <button
                                onClick={() => handleUpdateStatus(member.identity.id, 'Suspended')}
                                disabled={actionLoading}
                                className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-500 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                                title="Suspend Card access"
                              >
                                <AlertTriangle className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Revoke Action */}
                            {member.identity.verification_status !== 'Revoked' && (
                              <button
                                onClick={() => handleUpdateStatus(member.identity.id, 'Revoked')}
                                disabled={actionLoading}
                                className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-500 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                                title="Revoke & Blacklist Card"
                              >
                                <ShieldX className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* 3. Forensic Scan Audit logs Section */}
      <GlassCard className="p-6 flex flex-col gap-4 text-left" hoverEffect={false}>
        <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-850 pb-3">
          <h3 className="font-extrabold text-base text-slate-800 dark:text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" />
            Verification Security Scan Ledger
          </h3>
          <span className="text-[8px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-widest font-mono">
            Forensic Telemetry
          </span>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/50 dark:border-slate-850 text-slate-450 font-bold uppercase tracking-wider">
                <th className="py-2.5 px-3">Scanned Identity</th>
                <th className="py-2.5 px-3">Result</th>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Browser / Device Agent</th>
                <th className="py-2.5 px-3 text-right">IP Address</th>
              </tr>
            </thead>
            <tbody>
              {logsLoading ? (
                <tr>
                  <td colSpan="5" className="text-center py-6 text-slate-450 italic">
                    Loading scan audit trail...
                  </td>
                </tr>
              ) : scanLogs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-6 text-slate-450 italic">
                    No QR scan activity recorded.
                  </td>
                </tr>
              ) : (
                scanLogs.map((log) => (
                  <tr key={log.id} className="border-b border-slate-100/40 dark:border-slate-850/50 hover:bg-slate-50/10 transition-all duration-150">
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        {log.profile_image ? (
                          <img src={log.profile_image} alt={log.full_name} className="w-6 h-6 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-sky-500 to-cyan-400 text-white font-extrabold text-[9px] flex items-center justify-center uppercase shrink-0">
                            {log.full_name?.substring(0, 2) || 'ST'}
                          </div>
                        )}
                        <div className="flex flex-col min-w-0">
                          <strong className="text-slate-800 dark:text-slate-200 font-bold truncate max-w-[140px]">{log.full_name || 'Advocate'}</strong>
                          <span className="text-[8px] font-mono text-cyan-400">{log.tsrv_member_id}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-bold uppercase tracking-wider text-[8px]">
                      {log.verification_result === 'success' ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-500">
                          ✓ Success
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border border-rose-500/20 bg-rose-500/10 text-rose-500 animate-pulse">
                          ⚠ Access Blocked [{log.verification_result.replace('_failed', '')}]
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-450 dark:text-slate-500">
                      {new Date(log.scanned_at).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-slate-450 dark:text-slate-500 max-w-[180px] truncate" title={log.device_info}>
                      {log.device_info}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-450 dark:text-slate-500">
                      {log.ip_address}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
