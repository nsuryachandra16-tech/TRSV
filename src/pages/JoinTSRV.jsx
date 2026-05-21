import React, { useState, useEffect } from 'react';
import { UserPlus, Send, ShieldCheck, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import GlassCard from '../components/GlassCard';
import PremiumButton from '../components/PremiumButton';
import AnimatedSection from '../components/AnimatedSection';

export default function JoinTSRV() {
  const { userProfile } = useAuth();
  const [constituencies, setConstituencies] = useState([]);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    collegeName: '',
    constituencyId: '',
    reason: ''
  });
  const [submitStatus, setSubmitStatus] = useState({ type: '', msg: '' });
  const [submitting, setSubmitting] = useState(false);

  // Load user profile details on mount if available
  useEffect(() => {
    if (userProfile) {
      setForm(prev => ({
        ...prev,
        fullName: userProfile.full_name || '',
        email: userProfile.email || '',
        phone: userProfile.phone || ''
      }));
    }
  }, [userProfile]);

  // Load constituencies list
  useEffect(() => {
    const fetchConstituencies = async () => {
      try {
        const res = await fetch('/api/constituencies');
        const data = await res.json();
        if (data.success) {
          setConstituencies(data.constituencies);
        }
      } catch (err) {
        console.error('Failed to load constituencies:', err);
      }
    };
    fetchConstituencies();
  }, []);

  const handleInputChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitStatus({ type: '', msg: '' });

    try {
      const res = await fetch('/api/join-trsv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.success) {
        setSubmitStatus({ type: 'success', msg: data.message });
        setForm({
          fullName: userProfile?.full_name || '',
          email: userProfile?.email || '',
          phone: userProfile?.phone || '',
          collegeName: '',
          constituencyId: '',
          reason: ''
        });
      } else {
        setSubmitStatus({ type: 'error', msg: data.message || 'Failed to submit application.' });
      }
    } catch (err) {
      setSubmitStatus({ type: 'error', msg: 'Network error. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-10 py-4 text-left">
      
      {/* Header Banner */}
      <AnimatedSection direction="up" className="max-w-3xl flex flex-col gap-3">
        <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400 tracking-widest uppercase">
          Student Recruitment Portal
        </span>
        <h1 className="text-3xl font-black text-slate-850 dark:text-white leading-tight">
          Join TSRV Campaign Node
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          Apply to become a registered student representative, campus coordinator, or safety squad leader inside your college campus grid.
        </p>
      </AnimatedSection>

      <AnimatedSection direction="up" className="w-full max-w-3xl">
        <GlassCard className="p-6 sm:p-8 bg-white/45 dark:bg-slate-950/20 border border-slate-200/50 dark:border-slate-850 shadow-xl rounded-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-cyan-500/5 to-transparent blur-2xl pointer-events-none" />
          
          <form onSubmit={handleFormSubmit} className="flex flex-col gap-5 relative z-10">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="fullName"
                  required
                  value={form.fullName}
                  onChange={handleInputChange}
                  placeholder="Enter your full name"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:border-cyan-500 focus:outline-none transition-colors duration-200 text-xs"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  value={form.email}
                  onChange={handleInputChange}
                  placeholder="Enter your email address"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:border-cyan-500 focus:outline-none transition-colors duration-200 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider">
                  Mobile Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  required
                  value={form.phone}
                  onChange={handleInputChange}
                  placeholder="Enter your mobile number"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:border-cyan-500 focus:outline-none transition-colors duration-200 text-xs"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider">
                  Constituency / Area <span className="text-rose-500">*</span>
                </label>
                <select
                  name="constituencyId"
                  required
                  value={form.constituencyId}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:outline-none transition-colors duration-200 text-xs"
                >
                  <option value="" className="bg-white dark:bg-slate-950 text-slate-400">Select Constituency</option>
                  {constituencies.map((con) => (
                    <option key={con.id} value={con.id} className="bg-white dark:bg-slate-955 text-slate-800 dark:text-slate-200">
                      {con.constituency_name} ({con.district})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider">
                College / Affiliated Campus Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="collegeName"
                required
                value={form.collegeName}
                onChange={handleInputChange}
                placeholder="Enter your full college name"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:border-cyan-500 focus:outline-none transition-colors duration-200 text-xs"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider">
                Why do you want to join TSRV? <span className="text-rose-500">*</span>
              </label>
              <textarea
                name="reason"
                required
                rows={4}
                value={form.reason}
                onChange={handleInputChange}
                placeholder="Describe your motivation to join, and list any leadership roles you have held..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:border-cyan-500 focus:outline-none transition-colors duration-200 text-xs resize-none"
              />
            </div>

            {submitStatus.msg && (
              <div className={`p-4 rounded-xl border text-xs font-semibold flex items-center gap-2.5 ${
                submitStatus.type === 'success' 
                  ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                  : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
              }`}>
                {submitStatus.type === 'success' ? <ShieldCheck className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                <span>{submitStatus.msg}</span>
              </div>
            )}

            <div className="flex justify-end mt-2">
              <PremiumButton 
                variant="primary" 
                size="sm" 
                type="submit"
                disabled={submitting}
                icon={submitting ? null : <Send className="w-3.5 h-3.5" />}
              >
                {submitting ? 'Submitting Application...' : 'Submit Application'}
              </PremiumButton>
            </div>
          </form>
        </GlassCard>
      </AnimatedSection>

    </div>
  );
}
