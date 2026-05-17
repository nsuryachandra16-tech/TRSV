import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ShieldCheck, ShieldAlert, Calendar, CheckCircle2, AlertTriangle, Star, Activity, User, Award, Phone } from 'lucide-react';
import GlassCard from '../components/GlassCard';

export default function PublicVerification() {
  const { token_or_id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const runVerificationScan = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/identity/verify/${token_or_id}`);
      const resData = await response.json();
      if (resData.success) {
        setData(resData);
      } else {
        setError(resData.message || 'Decryption failed: Member digital record is not indexed on our core PostgreSQL node.');
      }
    } catch (err) {
      console.error(err);
      setError('Communication with the TS-State core governance server timed out.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runVerificationScan();
  }, [token_or_id]);

  if (loading) {
    return (
      <div className="w-full min-h-[85vh] flex flex-col items-center justify-center gap-3">
        <div className="w-12 h-12 rounded-full border-2 border-t-cyan-500 border-slate-200 dark:border-slate-800 animate-spin" />
        <p className="text-xs font-black uppercase tracking-widest text-slate-450 animate-pulse mt-2">Connecting to Telangana Neon Database...</p>
      </div>
    );
  }

  // Error Card UI
  if (error) {
    return (
      <div className="w-full min-h-[80vh] flex flex-col items-center justify-center p-4">
        <GlassCard className="max-w-[480px] p-8 text-center border-red-500/20 relative" hoverEffect={false}>
          <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 mx-auto mb-5 animate-bounce">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2">Decryption Error</h2>
          <p className="text-xs text-rose-550 dark:text-rose-400 font-mono bg-rose-500/5 p-4 rounded-xl border border-rose-500/10 leading-relaxed">
            {error}
          </p>
          <div className="text-[10px] text-slate-450 mt-6 leading-relaxed">
            TELANGANA RAKSHANA SENA VIDYARTHI VIBHAGAM<br />
            State Audit Security Node: <span className="font-mono">TSRV-SEC-CORE</span>
          </div>
        </GlassCard>
      </div>
    );
  }

  const { identity, profile, metrics, verified, result } = data;

  const getStatusVisuals = () => {
    switch (identity.verification_status) {
      case 'Verified':
        return {
          icon: <ShieldCheck className="w-10 h-10 text-emerald-400 animate-pulse" />,
          title: 'VERIFIED OFFICIAL',
          sub: 'This governance credential is fully certified and validated.',
          glow: 'shadow-glow-emerald border-emerald-500/20 bg-emerald-500/5',
          textClass: 'text-emerald-500 dark:text-emerald-400'
        };
      case 'Active':
        return {
          icon: <ShieldCheck className="w-10 h-10 text-cyan-400" />,
          title: 'ACTIVE MEMBER',
          sub: 'Official member in active governance standing.',
          glow: 'shadow-glow-cyan border-cyan-500/20 bg-cyan-500/5',
          textClass: 'text-cyan-500 dark:text-cyan-400'
        };
      case 'Suspended':
        return {
          icon: <ShieldAlert className="w-10 h-10 text-amber-500 animate-bounce" />,
          title: 'TEMPORARILY SUSPENDED',
          sub: 'This credential has been temporarily frozen pending a leadership audit.',
          glow: 'shadow-glow-amber border-amber-500/20 bg-amber-500/5',
          textClass: 'text-amber-500'
        };
      case 'Inactive':
        return {
          icon: <ShieldAlert className="w-10 h-10 text-slate-400" />,
          title: 'INACTIVE CARDHOLDER',
          sub: 'This digital identity card has expired or is currently inactive.',
          glow: 'border-slate-500/20 bg-slate-500/5',
          textClass: 'text-slate-400'
        };
      case 'Revoked':
      default:
        return {
          icon: <ShieldAlert className="w-10 h-10 text-rose-500 animate-pulse" />,
          title: 'CREDENTIALS REVOKED',
          sub: 'This card was officially revoked by Supreme Command and is no longer valid.',
          glow: 'shadow-glow-rose border-rose-500/20 bg-rose-500/5',
          textClass: 'text-rose-500'
        };
    }
  };

  const statusVisual = getStatusVisuals();

  return (
    <div className="w-full flex flex-col gap-8 text-left select-none animate-fadeIn py-6 max-w-6xl mx-auto">
      
      {/* 1. Pulsing Trust Status Shield Banner */}
      <GlassCard className={`p-8 flex flex-col md:flex-row items-center gap-6 border ${statusVisual.glow}`} hoverEffect={false}>
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 shrink-0">
          {statusVisual.icon}
        </div>
        <div className="flex flex-col text-center md:text-left gap-1.5 min-w-0">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">TSRV Public Verification Node</span>
          <h1 className={`text-3xl font-black tracking-tight ${statusVisual.textClass}`}>
            {statusVisual.title}
          </h1>
          <p className="text-xs text-slate-450 dark:text-slate-400 leading-relaxed">
            {statusVisual.sub} Sync Timestamp: <strong className="font-mono text-slate-750 dark:text-slate-200">{new Date(identity.issued_at).toLocaleString()}</strong>
          </p>
        </div>
      </GlassCard>

      {/* 2. Grid Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        
        {/* Left Column: Official Profile Details (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <GlassCard className="p-6 flex flex-col gap-6" hoverEffect={false}>
            <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-850 pb-3">
              <h2 className="font-extrabold text-base text-slate-850 dark:text-white flex items-center gap-2">
                <User className="w-5 h-5 text-cyan-400" />
                Profile Identity
              </h2>
              <span className="text-[8px] font-mono font-bold text-slate-450 dark:text-slate-500 uppercase tracking-widest">
                TSRV-ID-{identity.id}
              </span>
            </div>

            {/* Profile Avatar */}
            <div className="flex flex-col items-center text-center gap-3">
              {profile.profile_image ? (
                <img 
                  src={profile.profile_image} 
                  alt={profile.full_name} 
                  className="w-24 h-24 rounded-full object-cover border-2 border-cyan-400/30 shadow-glow-cyan"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-sky-500 to-cyan-400 text-white font-black text-4xl flex items-center justify-center shadow-glow-cyan uppercase">
                  {profile.full_name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                </div>
              )}

              <div className="flex flex-col gap-1 mt-2">
                <h3 className="font-black text-xl text-slate-800 dark:text-white">{profile.full_name}</h3>
                <span className="text-xs font-bold text-cyan-500 uppercase tracking-widest">
                  {profile.role.replace('_', ' ')}
                </span>
              </div>
            </div>

            {/* Official Credentials Fields */}
            <div className="flex flex-col gap-3 text-xs border-t border-slate-200/50 dark:border-slate-850 pt-5">
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-450">Unique Member ID:</span>
                <strong className="font-mono text-cyan-500 text-sm font-bold">{identity.tsrv_member_id}</strong>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-450">Active Constituency:</span>
                <strong className="text-slate-700 dark:text-slate-200">{profile.constituency_name || 'State Headquarters'}</strong>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-450">Affiliated Campus:</span>
                <strong className="text-slate-700 dark:text-slate-200 truncate max-w-[200px]">{profile.college_name || 'Statewide Council Node'}</strong>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-450">Credential Status:</span>
                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${statusVisual.glow.replace('p-8', '')}`}>
                  {identity.verification_status}
                </span>
              </div>
            </div>
          </GlassCard>

          {/* Verification Audit security badge */}
          <div className="flex items-center gap-3 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 text-[10px] text-slate-450 leading-normal text-left">
            <Award className="w-5 h-5 text-cyan-400 shrink-0" />
            <span>This verification ledger is signed securely by the Telangana Rakshana Sena Vidyarthi Vibhagam core administrative team. System audits are recorded on Neon PostgreSQL nodes.</span>
          </div>
        </div>

        {/* Right Column: Performance Stats & Chronological timeline (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* Grid Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
            <GlassCard className="p-4 flex flex-col text-left gap-1" hoverEffect={false}>
              <span className="text-[9px] font-black text-slate-450 uppercase tracking-wider">Resolved Issues</span>
              <strong className="text-xl font-black text-slate-800 dark:text-white">
                {metrics.issues_resolved}
              </strong>
            </GlassCard>
            <GlassCard className="p-4 flex flex-col text-left gap-1" hoverEffect={false}>
              <span className="text-[9px] font-black text-slate-450 uppercase tracking-wider">Pending Tasks</span>
              <strong className="text-xl font-black text-slate-800 dark:text-white">
                {metrics.issues_pending}
              </strong>
            </GlassCard>
            <GlassCard className="p-4 flex flex-col text-left gap-1" hoverEffect={false}>
              <span className="text-[9px] font-black text-slate-450 uppercase tracking-wider">Campaigns Run</span>
              <strong className="text-xl font-black text-slate-800 dark:text-white">
                {metrics.active_campaigns}
              </strong>
            </GlassCard>
            <GlassCard className="p-4 flex flex-col text-left gap-1" hoverEffect={false}>
              <span className="text-[9px] font-black text-slate-450 uppercase tracking-wider">Official Rating</span>
              <strong className="text-xl font-black text-amber-500 flex items-center gap-0.5">
                ★ {metrics.rating}
              </strong>
            </GlassCard>
          </div>

          {/* Timeline of Governance */}
          <GlassCard className="p-6 flex flex-col gap-4 text-left relative" hoverEffect={false}>
            <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-850 pb-3">
              <h3 className="font-extrabold text-base text-slate-800 dark:text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-cyan-400" />
                Leadership Milestones
              </h3>
              <span className="text-[8px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-widest font-mono">
                Postgres Audit History
              </span>
            </div>

            <div className="relative border-l border-slate-200/60 dark:border-slate-800/80 pl-6 ml-2 flex flex-col gap-6 py-2">
              {metrics.timeline && metrics.timeline.length > 0 ? (
                metrics.timeline.map((item, idx) => (
                  <div key={idx} className="relative group text-left">
                    <div className="absolute -left-[30px] top-1 w-2.5 h-2.5 rounded-full border border-cyan-400 bg-white dark:bg-slate-900 shadow-glow-cyan" />
                    
                    <span className="text-[10px] font-bold text-cyan-500 font-mono block">
                      {item.date}
                    </span>
                    <p className="text-xs text-slate-700 dark:text-slate-350 font-semibold mt-1">
                      {item.event}
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-400 dark:text-slate-500 py-4 italic">
                  No chronological timeline logs seed found.
                </div>
              )}
            </div>
          </GlassCard>
        </div>

      </div>
    </div>
  );
}
