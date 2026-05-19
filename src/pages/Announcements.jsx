import React, { useState, useEffect } from 'react';
import { Volume2, Bell, AlertOctagon, Calendar, ArrowRight, BookOpen, Send, PlusCircle, CheckCircle, ShieldAlert, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import GlassCard from '../components/GlassCard';
import AnimatedSection from '../components/AnimatedSection';
import PremiumButton from '../components/PremiumButton';

const formatRole = (role) => {
  if (role === 'supreme_admin') return 'TRSV Founder';
  if (role === 'dev') return 'Developer';
  if (role === 'president') return 'State President';
  if (role === 'general_secretary') return 'General Secretary';
  if (role === 'vice_president') return 'Vice President';
  if (role === 'secretary') return 'Secretary';
  return role ? role.toUpperCase() : 'Officer';
};

export default function Announcements() {
  const { userProfile } = useAuth();
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Form state for publishing circular
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetAudience, setTargetAudience] = useState('all');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Authorized roles to post circulars: general_secretary, president, supreme_admin, dev
  const isAuthorizedToPost = userProfile && ['dev', 'supreme_admin', 'president', 'general_secretary'].includes(userProfile.role);

  const fetchAnnouncements = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('tsrv_session_token');
      const response = await fetch('/api/announcements', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setNotices(data.announcements || []);
      } else {
        setError(data.message || 'Failed to sync statewide circulars.');
      }
    } catch (err) {
      console.error(err);
      setError('Communication link failure with governance core node.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setSubmitting(true);
    setSuccessMsg('');
    setError('');

    try {
      const token = localStorage.getItem('tsrv_session_token');
      const response = await fetch('/api/announcements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          targetAudience
        })
      });

      const data = await response.json();
      if (data.success) {
        setSuccessMsg('Statewide circular alert dispatched successfully.');
        setTitle('');
        setContent('');
        setTargetAudience('all');
        setShowForm(false);
        // Refresh feed
        fetchAnnouncements();
      } else {
        setError(data.message || 'Failed to publish statewide circular.');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to dispatch circular due to connection error.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-10 py-4 text-left">
      
      {/* Header Banner */}
      <AnimatedSection direction="up" className="text-center max-w-3xl mx-auto flex flex-col gap-4">
        <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400 tracking-widest uppercase">
          OFFICIAL CIRCULARS
        </span>
        <h1 className="fluid-heading-2 font-black text-slate-850 dark:text-white leading-tight">
          Statewide Campaign Notices
        </h1>
        <p className="text-base sm:text-lg text-slate-500 dark:text-slate-400 leading-relaxed text-center">
          Review authentic circulars, anti-ragging notices, and statewide administrative bulletins issued directly by State Command.
        </p>

        {isAuthorizedToPost && (
          <div className="mt-2 flex justify-center">
            <PremiumButton
              variant="glow"
              size="md"
              onClick={() => setShowForm(!showForm)}
              icon={<PlusCircle className="w-4 h-4" />}
            >
              {showForm ? 'Cancel Form' : 'Publish New Circular'}
            </PremiumButton>
          </div>
        )}
      </AnimatedSection>

      {/* Publish Form (Only for authorized roles) */}
      {isAuthorizedToPost && showForm && (
        <AnimatedSection direction="down" className="w-full max-w-3xl mx-auto">
          <GlassCard className="p-6 sm:p-8 border border-cyan-500/20 shadow-glow-cyan/5">
            <h2 className="text-lg font-black text-slate-850 dark:text-white mb-6 uppercase tracking-wider flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-cyan-400" />
              Publish State Command Circular
            </h2>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Circular Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Mandatory Anti-Ragging Coordination Briefing"
                  className="w-full bg-slate-100/50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-850 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Target Audience Scope
                  </label>
                  <select
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    className="w-full bg-slate-100/50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-850 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
                  >
                    <option value="all">Everyone (Statewide)</option>
                    <option value="student">Students Only</option>
                    <option value="leader">Coordinators & Leaders Only</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Circular Content Bulletin
                </label>
                <textarea
                  required
                  rows={5}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Type the detailed circular statement..."
                  className="w-full bg-slate-100/50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-850 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 resize-y"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || !title.trim() || !content.trim()}
                className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 disabled:opacity-30 disabled:pointer-events-none text-white text-sm font-black transition-all duration-300 shadow-md shadow-cyan-950/20 hover:scale-101 active:scale-99 flex items-center justify-center gap-2 cursor-pointer"
              >
                {submitting ? 'Dispatching Circular...' : 'Dispatch Circular Alert'}
                <Send className="w-4 h-4" />
              </button>
            </form>
          </GlassCard>
        </AnimatedSection>
      )}

      {/* Alerts Feedback */}
      {(successMsg || error) && (
        <div className="w-full max-w-3xl mx-auto">
          {successMsg && (
            <div className="flex items-center gap-3 p-4 rounded-xl border border-green-500/20 bg-green-500/5 text-green-600 dark:text-green-400 text-xs font-semibold">
              <CheckCircle className="w-4.5 h-4.5 shrink-0" />
              {successMsg}
            </div>
          )}
          {error && (
            <div className="flex items-center gap-3 p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-600 dark:text-rose-450 text-xs font-semibold">
              <ShieldAlert className="w-4.5 h-4.5 shrink-0" />
              {error}
            </div>
          )}
        </div>
      )}

      {/* Announcements Feed Grid */}
      <section className="flex flex-col gap-6 w-full max-w-4xl mx-auto">
        {loading ? (
          <div className="py-20 text-center text-sm text-slate-400 dark:text-slate-550 animate-pulse">
            Syncing statewide circular dispatches...
          </div>
        ) : notices.length > 0 ? (
          notices.map((note) => (
            <GlassCard key={note.id} hoverEffect={true} className="p-6 sm:p-8 flex flex-col sm:flex-row items-start gap-6 border-l-2 border-cyan-500 bg-white/40 dark:bg-slate-950/25">
              <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200/40 dark:border-slate-800 flex items-center justify-center shrink-0">
                <Bell className="w-5 h-5 text-cyan-400" />
              </div>

              <div className="flex-1 flex flex-col gap-3 min-w-0">
                <div className="flex flex-wrap items-center justify-between text-[10px] font-black uppercase tracking-wider gap-2">
                  <span className="text-cyan-500 bg-cyan-500/10 px-2.5 py-0.5 rounded-md border border-cyan-500/20">
                    Scope: {note.target_audience}
                  </span>
                  <span className="text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(note.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </div>

                <h2 className="font-extrabold text-xl text-slate-850 dark:text-white leading-snug">
                  {note.title}
                </h2>
                
                <p className="text-sm text-slate-600 dark:text-slate-350 leading-relaxed whitespace-pre-wrap">
                  {note.content}
                </p>

                {/* Author Credentials metadata */}
                <div className="pt-3.5 border-t border-slate-200/40 dark:border-slate-850/50 flex items-center gap-2.5 text-[11px] text-slate-500 dark:text-slate-400">
                  <User className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>
                    Dispatched by: <strong className="text-slate-850 dark:text-slate-200">{note.author_name || 'Supreme Leader'}</strong> ({formatRole(note.author_role)})
                    {note.author_constituency && (
                      <>
                        {' '}from <strong className="text-cyan-500 dark:text-cyan-400">{note.author_constituency}</strong>
                      </>
                    )}
                  </span>
                </div>
              </div>
            </GlassCard>
          ))
        ) : (
          <div className="py-20 text-center text-slate-400 dark:text-slate-550 border border-dashed border-slate-200 dark:border-slate-850 rounded-2xl bg-slate-50/10 dark:bg-slate-950/5 italic text-sm">
            No official statewide circular notices found.
          </div>
        )}
      </section>

    </div>
  );
}
