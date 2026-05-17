import React, { useState, useEffect, useRef } from 'react';
import { X, ShieldAlert, AlertTriangle, FileText, Clock, MessageSquare, Shield, CheckCircle, Send, Play } from 'lucide-react';
import PremiumButton from './PremiumButton';

export default function ComplaintDetailsModal({ ticketId, onClose, userProfile, onUpdateSuccess }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Discussion state
  const [newComment, setNewComment] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const scrollRef = useRef(null);

  // Leader Action State
  const [updateStatus, setUpdateStatus] = useState('');
  const [updateNote, setUpdateNote] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [escalateLevel, setEscalateLevel] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchDetails();
  }, [ticketId]);

  const fetchDetails = async () => {
    try {
      const token = localStorage.getItem('tsrv_session_token');
      const res = await fetch(`/api/complaints/${ticketId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success) {
        setData(json);
        setUpdateStatus(json.complaint.status);
      } else {
        setError(json.message);
      }
    } catch (err) {
      setError('Failed to fetch ticket details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Auto-scroll to bottom of discussion when new data loads
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [data?.discussions]);

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setPostingComment(true);
    try {
      const token = localStorage.getItem('tsrv_session_token');
      const res = await fetch(`/api/complaints/${ticketId}/discuss`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: newComment })
      });
      const json = await res.json();
      if (json.success) {
        setNewComment('');
        await fetchDetails();
      }
    } catch (err) {
      console.error('Failed to post comment', err);
    } finally {
      setPostingComment(false);
    }
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    setUpdating(true);
    try {
      const token = localStorage.getItem('tsrv_session_token');
      const res = await fetch(`/api/complaints/${ticketId}/status`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: updateStatus, 
          note: updateNote,
          resolution_notes: resolutionNotes,
          current_handler: userProfile.id
        })
      });
      const json = await res.json();
      if (json.success) {
        setUpdateNote('');
        if (onUpdateSuccess) onUpdateSuccess();
        await fetchDetails();
      } else {
        alert(json.message);
      }
    } catch (err) {
      console.error('Failed to update status', err);
    } finally {
      setUpdating(false);
    }
  };

  const handleEscalate = async (e) => {
    e.preventDefault();
    if (!escalateLevel) return;
    setUpdating(true);
    try {
      const token = localStorage.getItem('tsrv_session_token');
      const res = await fetch(`/api/complaints/${ticketId}/escalate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ level_to: parseInt(escalateLevel), reason: updateNote || 'Manual escalation requested.' })
      });
      const json = await res.json();
      if (json.success) {
        setUpdateNote('');
        setEscalateLevel('');
        if (onUpdateSuccess) onUpdateSuccess();
        await fetchDetails();
      } else {
        alert(json.message);
      }
    } catch (err) {
      console.error('Failed to escalate', err);
    } finally {
      setUpdating(false);
    }
  };

  const getUrgencyColor = (urgency) => {
    const maps = {
      critical: 'bg-rose-500/10 text-rose-500 border-rose-500/30',
      high: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
      medium: 'bg-sky-500/10 text-sky-500 border-sky-500/30',
      low: 'bg-green-500/10 text-green-500 border-green-500/30'
    };
    return maps[urgency?.toLowerCase()] || maps.medium;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
        <div className="w-10 h-10 rounded-full border-2 border-t-cyan-500 border-r-transparent border-white/20 animate-spin shadow-glow-cyan" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-rose-500/50 shadow-glow-rose">
          <p className="text-rose-500 font-bold mb-4">{error || 'Ticket not found'}</p>
          <PremiumButton variant="secondary" size="sm" onClick={onClose}>Close Panel</PremiumButton>
        </div>
      </div>
    );
  }

  const { complaint, timeline, files, discussions } = data;
  const isEmergency = complaint.emergency_flag || complaint.urgency === 'Critical';
  const isLeader = userProfile?.role && userProfile.role !== 'student';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-2 sm:p-6 animate-fadeIn">
      <div className={`w-full max-w-5xl max-h-[95vh] flex flex-col bg-white/95 dark:bg-slate-900/95 rounded-3xl border shadow-premium-dark overflow-hidden relative ${isEmergency ? 'border-rose-500/40 shadow-glow-rose' : 'border-slate-200 dark:border-slate-800'}`}>
        
        {/* Header Ribbon */}
        <div className={`px-6 py-4 border-b flex items-center justify-between shrink-0 ${isEmergency ? 'bg-rose-500/10 border-rose-500/20' : 'bg-slate-100/50 dark:bg-slate-850 border-slate-200 dark:border-slate-800'}`}>
          <div className="flex flex-col">
            <div className="flex items-center gap-3">
              {isEmergency ? <AlertTriangle className="w-5 h-5 text-rose-500 animate-pulse" /> : <ShieldAlert className="w-5 h-5 text-cyan-500" />}
              <h2 className={`font-black text-lg ${isEmergency ? 'text-rose-500' : 'text-slate-850 dark:text-white'}`}>
                {complaint.title}
              </h2>
            </div>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${getUrgencyColor(complaint.urgency)}`}>
                {complaint.urgency}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
                {complaint.status}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono tracking-wide">
                Ticket #{complaint.id} • {new Date(complaint.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
          
          <button onClick={onClose} className="p-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Multi-Pane Body */}
        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
          
          {/* Left Column: Details & Timeline */}
          <div className="w-full lg:w-1/2 flex flex-col border-r border-slate-200/50 dark:border-slate-800 bg-white dark:bg-slate-900/50 overflow-y-auto custom-sidebar-scrollbar p-6 gap-8">
            
            <section>
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-500" /> Incident Brief
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed">
                {complaint.description}
              </p>
              
              <div className="grid grid-cols-2 gap-4 mt-5 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Student Advocate</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                    {complaint.anonymous ? <Shield className="w-3.5 h-3.5 text-cyan-500" /> : null}
                    {complaint.student_name}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Category</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-white">{complaint.category}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">College Node</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-white truncate" title={complaint.college_name}>{complaint.college_name || 'State Scope'}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Constituency Hub</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-white truncate">{complaint.constituency_name || 'State Scope'}</span>
                </div>
              </div>
            </section>

            {/* Proofs Vault */}
            {files.length > 0 && (
              <section>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-cyan-500" /> Evidence Vault
                </h3>
                <div className="flex flex-col gap-2">
                  {files.map((file, idx) => (
                    <a 
                      key={idx}
                      href={file.file_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 rounded-xl border border-slate-200/60 dark:border-slate-800 bg-white/50 dark:bg-slate-850/50 hover:border-cyan-500/50 transition-colors group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-slate-400 group-hover:text-cyan-500" />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{file.file_name}</span>
                      </div>
                      <span className="text-[9px] font-extrabold uppercase tracking-wider text-cyan-500 bg-cyan-500/10 px-2 py-1 rounded shrink-0">View File</span>
                    </a>
                  ))}
                </div>
              </section>
            )}

            <section>
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-500" /> Live Audit Timeline
              </h3>
              <div className="relative pl-3 border-l-2 border-slate-200 dark:border-slate-800 flex flex-col gap-6 ml-2">
                {timeline.map((event, idx) => (
                  <div key={idx} className="relative">
                    <div className="absolute -left-[18px] top-1 w-3 h-3 rounded-full bg-cyan-500 shadow-glow-cyan" />
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-bold text-slate-850 dark:text-white">{event.status}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{new Date(event.created_at).toLocaleString()}</span>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">{event.note}</p>
                      <span className="text-[9px] font-bold text-cyan-600 dark:text-cyan-400 mt-1 uppercase tracking-wider">Updated by: {event.action_by_name || 'System Auto-Trigger'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

          </div>

          {/* Right Column: Discussions & Controls */}
          <div className="w-full lg:w-1/2 flex flex-col bg-slate-50/50 dark:bg-slate-900 overflow-hidden">
            
            {/* Threaded Discussion Panel */}
            <div className="flex flex-col flex-1 overflow-hidden p-6 border-b border-slate-200/50 dark:border-slate-800">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-white mb-4 flex items-center gap-2 shrink-0">
                <MessageSquare className="w-4 h-4 text-cyan-500" /> Operations Discussion
              </h3>
              
              <div ref={scrollRef} className="flex-1 overflow-y-auto pr-2 custom-sidebar-scrollbar flex flex-col gap-4">
                {discussions.length > 0 ? discussions.map(msg => {
                  const isMine = msg.user_id === userProfile.id;
                  const isLeaderRole = msg.user_role !== 'student';
                  return (
                    <div key={msg.id} className={`flex flex-col max-w-[85%] ${isMine ? 'self-end items-end text-right' : 'self-start items-start text-left'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                          {msg.user_name}
                        </span>
                        {isLeaderRole && (
                          <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">
                            {msg.user_role.replace('_', ' ')}
                          </span>
                        )}
                      </div>
                      <div className={`p-3 rounded-2xl text-sm ${isMine ? 'bg-cyan-500 text-white shadow-glow-cyan rounded-tr-none' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-tl-none'}`}>
                        {msg.message}
                      </div>
                      <span className="text-[9px] text-slate-400 mt-1">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                }) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-60">
                    <MessageSquare className="w-8 h-8 mb-2" />
                    <span className="text-xs font-bold uppercase tracking-wider">No coordination logs yet.</span>
                  </div>
                )}
              </div>

              <form onSubmit={handlePostComment} className="mt-4 flex gap-2 shrink-0 relative">
                <input 
                  type="text"
                  placeholder="Post coordination message or update..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-850 text-sm focus:outline-none focus:border-cyan-400 text-slate-800 dark:text-white"
                />
                <button 
                  type="submit"
                  disabled={postingComment || !newComment.trim()}
                  className="p-3 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white transition-colors shadow-glow-cyan disabled:opacity-50 disabled:shadow-none"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>

            {/* Leader Override & Escalation Panel */}
            {isLeader && complaint.status !== 'Resolved' && (
              <div className="p-6 bg-slate-100 dark:bg-slate-850 shrink-0">
                <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2">
                  <Play className="w-3 h-3 text-cyan-500" /> Leadership Handler Actions
                </h3>
                
                <div className="flex flex-col gap-3">
                  <form onSubmit={handleUpdateStatus} className="flex items-end gap-3">
                    <div className="flex-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Shift Status</label>
                      <select 
                        value={updateStatus}
                        onChange={(e) => setUpdateStatus(e.target.value)}
                        className="w-full p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:border-cyan-400 text-slate-800 dark:text-white"
                      >
                        <option value="Audit Phase">Audit Phase</option>
                        <option value="Under Investigation">Under Investigation</option>
                        <option value="Action Imposed">Action Imposed</option>
                        <option value="Resolved">Resolved</option>
                        <option value="Dismissed">Dismissed</option>
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Timeline Note</label>
                      <input 
                        type="text"
                        placeholder="Action details..."
                        value={updateNote}
                        onChange={(e) => setUpdateNote(e.target.value)}
                        className="w-full p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:border-cyan-400 text-slate-800 dark:text-white"
                      />
                    </div>
                    <PremiumButton type="submit" variant="primary" size="sm" disabled={updating}>Commit</PremiumButton>
                  </form>

                  {/* Manual Escalation Override */}
                  <form onSubmit={handleEscalate} className="flex items-end gap-3 mt-1 pt-3 border-t border-slate-200/50 dark:border-slate-700">
                    <div className="flex-1">
                      <label className="text-[9px] font-bold text-rose-400 uppercase tracking-wider block mb-1">Force Escalate Hierarchy</label>
                      <select 
                        value={escalateLevel}
                        onChange={(e) => setEscalateLevel(e.target.value)}
                        className="w-full p-2.5 rounded-lg border border-rose-200/60 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-900/10 text-xs focus:outline-none focus:border-rose-400 text-slate-800 dark:text-white"
                      >
                        <option value="">Select Level...</option>
                        <option value="0">0: College Node</option>
                        <option value="1">1: Constituency Level</option>
                        <option value="2">2: State Governance</option>
                      </select>
                    </div>
                    <PremiumButton type="submit" variant="secondary" size="sm" disabled={updating || !escalateLevel} className="!border-rose-500/30 !text-rose-500 hover:!bg-rose-500 hover:!text-white">Escalate Up</PremiumButton>
                  </form>
                </div>

              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
}
