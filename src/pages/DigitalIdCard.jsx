import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, RefreshCw, FlipHorizontal, Download, Printer, ShieldAlert, ArrowRight, Sun, Moon, Info, PhoneCall } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import GlassCard from '../components/GlassCard';
import PremiumButton from '../components/PremiumButton';

export default function DigitalIdCard() {
  const { userProfile } = useAuth();
  
  // State for card telemetry
  const [identity, setIdentity] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // UI Interactive States
  const [isFlipped, setIsFlipped] = useState(false);
  const [cardTheme, setCardTheme] = useState('dark'); // 'dark' | 'light'
  const cardRef = useRef(null);

  // Mouse Tracking Coordinates for 3D Tilt Effect
  const [tiltStyle, setTiltStyle] = useState({
    transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg)',
    reflectionX: '50%',
    reflectionY: '50%',
    reflectionOpacity: 0
  });

  // Fetch Member ID Card Data
  const loadIdentityData = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('tsrv_session_token');
      const response = await fetch('/api/identity/my-id', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setIdentity(data.identity);
        setMetrics(data.metrics);
      } else {
        setError(data.message || 'Failed to sync your digital identity card.');
      }
    } catch (err) {
      console.error(err);
      setError('Network communication failed with identity node.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIdentityData();
  }, []);

  // 3D Tilt Logic
  const handleMouseMove = (e) => {
    if (!cardRef.current || isFlipped) return;
    
    const card = cardRef.current;
    const rect = card.getBoundingClientRect();
    
    // Relative coordinates inside the card bounding box
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Map to percentage offsets (-0.5 to 0.5)
    const px = (x / rect.width) - 0.5;
    const py = (y / rect.height) - 0.5;
    
    // Rotation bounds: max 15 degrees tilt
    const rotateY = px * 22; 
    const rotateX = -py * 22; 
    
    // Position of dynamic reflection glint
    const glintX = `${(x / rect.width) * 100}%`;
    const glintY = `${(y / rect.height) * 100}%`;

    setTiltStyle({
      transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`,
      reflectionX: glintX,
      reflectionY: glintY,
      reflectionOpacity: 0.35
    });
  };

  const handleMouseLeave = () => {
    setTiltStyle({
      transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
      reflectionX: '50%',
      reflectionY: '50%',
      reflectionOpacity: 0
    });
  };

  // Printable layout trigger
  const handlePrint = () => {
    window.print();
  };

  // High-Resolution ID Card PNG Mock Download Trigger
  const handleDownload = () => {
    // Dynamically retrieve QR and card details to compile a printable visual
    const link = document.createElement('a');
    link.download = `${identity?.tsrv_member_id || 'TSRV_Card'}_DigitalID.png`;
    
    // Generate static mockup representing card structure in a clean layout
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 380;
    const ctx = canvas.getContext('2d');

    // Base background colors matching HSL dark/light modes
    if (cardTheme === 'dark') {
      const gradient = ctx.createLinearGradient(0, 0, 600, 380);
      gradient.addColorStop(0, '#0f172a');
      gradient.addColorStop(1, '#020617');
      ctx.fillStyle = gradient;
    } else {
      const gradient = ctx.createLinearGradient(0, 0, 600, 380);
      gradient.addColorStop(0, '#f8fafc');
      gradient.addColorStop(1, '#e2e8f0');
      ctx.fillStyle = gradient;
    }
    ctx.fillRect(0, 0, 600, 380);

    // Decorative Borders
    ctx.strokeStyle = cardTheme === 'dark' ? 'rgba(34, 211, 238, 0.4)' : 'rgba(14, 165, 233, 0.5)';
    ctx.lineWidth = 4;
    ctx.strokeRect(8, 8, 584, 364);

    // Organization details
    ctx.fillStyle = cardTheme === 'dark' ? '#22d3ee' : '#0284c7';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.fillText('TELANGANA RAKSHANA SENA VIDYARTHI VIBHAGAM', 24, 40);

    ctx.fillStyle = cardTheme === 'dark' ? '#94a3b8' : '#64748b';
    ctx.font = '9px Outfit, sans-serif';
    ctx.fillText('STATE STUDENT GOVERNANCE COUNCIL', 24, 55);

    // User details
    ctx.fillStyle = cardTheme === 'dark' ? '#ffffff' : '#0f172a';
    ctx.font = 'bold 24px Outfit, sans-serif';
    ctx.fillText(userProfile?.full_name || 'TSRV Member', 24, 120);

    ctx.fillStyle = cardTheme === 'dark' ? '#38bdf8' : '#0ea5e9';
    ctx.font = '600 13px Outfit, sans-serif';
    const dynamicRoleStr = userProfile?.role === 'student' ? 'STUDENT' : 'UNION MEMBER';
    ctx.fillText(dynamicRoleStr, 24, 142);

    ctx.fillStyle = cardTheme === 'dark' ? '#cbd5e1' : '#334155';
    ctx.font = '12px Outfit, sans-serif';
    ctx.fillText(`Constituency: ${userProfile?.constituency_name || 'Statewide Network'}`, 24, 185);
    ctx.fillText(`Campus: ${userProfile?.college_name || 'Central Campus Node'}`, 24, 205);
    ctx.fillText(`Issued: ${new Date(identity?.issued_at).toLocaleDateString()}`, 24, 225);

    // Member ID Footer Code
    ctx.fillStyle = cardTheme === 'dark' ? '#38bdf8' : '#0ea5e9';
    ctx.font = 'bold 22px Courier New, monospace';
    ctx.fillText(identity?.tsrv_member_id || 'TSRV-HQ-0001', 24, 305);

    ctx.fillStyle = cardTheme === 'dark' ? '#10b981' : '#059669';
    ctx.font = 'bold 12px Outfit, sans-serif';
    ctx.fillText(`VERIFIED OFFICIAL [${identity?.verification_status || 'ACTIVE'}]`, 24, 335);

    // Simulated QR Placement Box
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(410, 100, 150, 150);
    ctx.fillStyle = '#000000';
    ctx.fillRect(425, 115, 120, 120);
    // Overlay dummy white modules to resemble scannable QR
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(445, 135, 80, 80);
    ctx.fillStyle = '#000000';
    ctx.fillRect(465, 155, 40, 40);

    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const getStatusDetails = (status) => {
    const maps = {
      Verified: { text: 'Verified Official', color: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10' },
      Active: { text: 'Active Member', color: 'text-cyan-400 border-cyan-500/20 bg-cyan-500/10' },
      Suspended: { text: 'Suspended Pending Audit', color: 'text-amber-500 border-amber-500/20 bg-amber-500/10' },
      Inactive: { text: 'Inactive Cardholder', color: 'text-slate-400 border-slate-500/20 bg-slate-500/10' },
      Revoked: { text: 'Revoked Cardholder', color: 'text-rose-500 border-rose-500/20 bg-rose-500/10' }
    };
    return maps[status] || maps.Active;
  };

  const statusObj = getStatusDetails(identity?.verification_status);

  if (loading) {
    return (
      <div className="w-full min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 rounded-full border-2 border-t-cyan-500 border-slate-200 dark:border-slate-800 animate-spin" />
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-450 animate-pulse">Syncing Secure ID Node...</p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-6 text-left select-none animate-fadeIn">
      {/* 1. Header Banner */}
      <div className="relative overflow-hidden rounded-2xl glass-panel-light dark:glass-panel-dark border border-slate-200/50 dark:border-slate-850 p-8 shadow-premium-light dark:shadow-premium-dark flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-cyan-500/10 to-transparent blur-xl pointer-events-none" />
        
        <div className="flex flex-col gap-2">
          <div className="inline-flex items-center gap-1.5 self-start px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 text-[10px] font-extrabold uppercase tracking-wider border border-cyan-500/20">
            Digital Identity Wallet
          </div>
          <h2 className="text-3xl font-black text-slate-800 dark:text-white">
            Your Governance Credential
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-xl leading-relaxed">
            Manage your holographic governance pass, download print-ready PNG configurations, or trigger QR validation scans for active civic-tech statewide operations.
          </p>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={() => setCardTheme(cardTheme === 'dark' ? 'light' : 'dark')}
            className="p-3 rounded-xl border border-slate-200/60 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 hover:bg-white/60 dark:hover:bg-slate-900/60 text-slate-600 dark:text-slate-350 transition-all duration-200 cursor-pointer active:scale-95"
            title="Toggle card layout color theme"
          >
            {cardTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <PremiumButton 
            variant="glow" 
            size="sm" 
            onClick={loadIdentityData}
            icon={<RefreshCw className="w-4 h-4" />}
          >
            Refresh Node
          </PremiumButton>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full">
        {/* Left Side: 3D ID Card Presentation (5 Cols, or centered 12 for students) */}
        <div className={`${userProfile?.role === 'student' ? 'lg:col-span-12' : 'lg:col-span-5'} flex flex-col items-center gap-6 select-none print:col-span-12`}>
          
          {/* Card perspective container */}
          <div 
            className="w-full max-w-[420px] aspect-[1.586/1] relative cursor-pointer group"
            style={{ perspective: '1000px' }}
            onClick={() => setIsFlipped(!isFlipped)}
          >
            {/* Holographic backing wrapper */}
            <div 
              ref={cardRef}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              className={`w-full h-full rounded-2xl transition-transform duration-700 ease-out preserve-3d relative border border-white/10 shadow-2xl flex flex-col justify-between overflow-hidden p-6 ${cardTheme === 'dark' ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}
              style={{
                transform: `${tiltStyle.transform} ${isFlipped ? 'rotateY(180deg)' : ''}`,
                boxShadow: cardTheme === 'dark' 
                  ? '0 25px 50px -12px rgba(34, 211, 238, 0.15)' 
                  : '0 25px 50px -12px rgba(14, 165, 233, 0.12)'
              }}
            >
              {/* --- FRONT SIDE --- */}
              <div className="absolute inset-0 p-6 flex flex-col justify-between backface-hidden z-25 bg-inherit rounded-2xl">
                {/* Holographic reflection glint sheet */}
                <div 
                  className="absolute inset-0 pointer-events-none transition-opacity duration-300 bg-[radial-gradient(circle_at_var(--x,50%)_var(--y,50%),rgba(255,255,255,0.18)_0%,rgba(255,255,255,0)_60%)] mix-blend-overlay"
                  style={{
                    '--x': tiltStyle.reflectionX,
                    '--y': tiltStyle.reflectionY,
                    opacity: tiltStyle.reflectionOpacity
                  }}
                />

                {/* ID Header */}
                <div className="flex items-center justify-between z-10">
                  <div className="flex flex-col text-left">
                    <span className="text-[14px] font-black tracking-widest text-cyan-400 uppercase">TSRV</span>
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Union Member Card</span>
                  </div>
                  <div className={`px-2 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-wider flex items-center gap-1 ${statusObj.color}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                    {statusObj.text}
                  </div>
                </div>

                {/* Card middle: Avatar & Profile */}
                <div className="flex items-center gap-4 my-2 z-10">
                  {userProfile?.profile_image ? (
                    <img 
                      src={userProfile.profile_image} 
                      alt={userProfile.full_name} 
                      className="w-14 h-14 rounded-xl object-cover border border-cyan-450/30 shadow-glow-cyan shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-tr from-sky-500 to-cyan-400 text-white font-black text-xl flex items-center justify-center shadow-glow-cyan uppercase shrink-0">
                      {userProfile?.full_name ? userProfile.full_name.split(' ').map(n => n[0]).join('').substring(0, 2) : 'ST'}
                    </div>
                  )}
                  <div className="flex flex-col min-w-0 text-left">
                    <h3 className="font-extrabold text-base truncate tracking-tight">{userProfile?.full_name}</h3>
                    <p className="text-[9px] font-bold text-cyan-400 uppercase tracking-widest mt-0.5">
                      {userProfile?.role === 'student' ? 'Student' : 'Union Member'}
                    </p>
                    <p className="text-[8px] text-slate-400 truncate mt-0.5">
                      Campus: {userProfile?.college_name || 'Academic Campus Node'}
                    </p>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="flex items-end justify-between border-t border-slate-200/20 dark:border-slate-800/80 pt-2.5 z-10">
                  <div className="flex flex-col text-left">
                    <span className="text-[7px] text-slate-400 uppercase tracking-widest">TSRV System Node ID</span>
                    <span className="text-sm font-black font-mono text-cyan-400 tracking-wider mt-0.5">
                      {identity?.tsrv_member_id}
                    </span>
                  </div>

                  {/* Dynamic scannable QR thumbnail code */}
                  <div className="p-1 rounded-lg bg-white shrink-0 border border-slate-300/30 shadow-glow-cyan/5">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=${window.location.origin}/#/verify/${identity?.qr_token}`} 
                      alt="Scannable Security QR" 
                      className="w-8 h-8"
                    />
                  </div>
                </div>
              </div>

              {/* --- BACK SIDE --- */}
              <div className="absolute inset-0 p-6 flex flex-col justify-between backface-hidden rotate-y-180 z-20 bg-inherit rounded-2xl">
                {/* Back card Header */}
                <div className="flex items-center justify-between">
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Union Security Chip</span>
                  <div className="w-8 h-6 rounded bg-gradient-to-tr from-amber-500 to-amber-300 relative overflow-hidden border border-amber-600/30">
                    <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-amber-700/40" />
                    <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-amber-700/40" />
                  </div>
                </div>

                {/* Back card Middle: Guidelines */}
                <div className="text-[8px] text-slate-400 leading-relaxed text-left flex flex-col gap-1.5 my-1.5 border-l border-cyan-500/20 pl-3">
                  <p className="font-extrabold uppercase text-cyan-400 tracking-wider">OFFICIAL SYSTEM DISCLOSURE</p>
                  <p>This digital identity wallet represents an authorized representative node of the Telangana Rakshana Sena Vidyarthi Vibhagam (TSRV).</p>
                  <p>Scan the front QR code to verify active database records, grievance resolution performance logs, and commission boundaries.</p>
                </div>

                {/* Back Card Footer: Support info */}
                <div className="flex items-end justify-between border-t border-slate-200/20 dark:border-slate-800/80 pt-2.5">
                  <div className="flex flex-col text-left">
                    <span className="text-[7px] text-slate-400 uppercase tracking-widest">TSRV Support</span>
                    <span className="text-[9px] font-bold mt-1 text-slate-350 flex items-center gap-1">
                      support@tsrv.org
                    </span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-[7px] text-slate-400 uppercase tracking-widest">Node Region</span>
                    <span className="text-[9px] font-bold text-slate-350 mt-0.5">
                      {userProfile?.constituency_name || 'State Headquarters'}
                    </span>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Interactive Flip Helper badge */}
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-450 dark:text-slate-500 uppercase tracking-wider select-none">
            <FlipHorizontal className="w-4 h-4 text-cyan-500 animate-bounce" />
            Click Card to Flip & View Details
          </div>

          {/* Actions toolbar */}
          <div className="flex gap-3 w-full max-w-[420px] print:hidden">
            <button
              onClick={handlePrint}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-slate-200/60 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 hover:bg-white/60 dark:hover:bg-slate-900/60 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all duration-200 cursor-pointer active:scale-95 shadow-sm"
            >
              <Printer className="w-4 h-4 text-cyan-500" />
              Print Pass
            </button>
            <button
              onClick={handleDownload}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-slate-200/60 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 hover:bg-white/60 dark:hover:bg-slate-900/60 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all duration-200 cursor-pointer active:scale-95 shadow-sm"
            >
              <Download className="w-4 h-4 text-sky-500" />
              PNG Export
            </button>
          </div>
        </div>

        {/* Right Side: Identity Metrics & Timelines (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6 print:col-span-12">
        
          {/* 1. Identity Verification Metrics */}
          <div className={`grid gap-4 w-full ${userProfile?.role === 'supreme_admin' ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2'}`}>
            <GlassCard className="p-4 flex flex-col text-left gap-1" hoverEffect={false}>
              <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Resolved Issues</span>
              <strong className="text-2xl font-black text-slate-800 dark:text-white">
                {metrics?.issues_resolved || 0}
              </strong>
            </GlassCard>
            <GlassCard className="p-4 flex flex-col text-left gap-1" hoverEffect={false}>
              <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Active Issues</span>
              <strong className="text-2xl font-black text-slate-800 dark:text-white">
                {metrics?.issues_pending || 0}
              </strong>
            </GlassCard>
            {userProfile?.role === 'supreme_admin' && (
              <>
                <GlassCard className="p-4 flex flex-col text-left gap-1" hoverEffect={false}>
                  <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Campaigns Run</span>
                  <strong className="text-2xl font-black text-slate-800 dark:text-white">
                    {metrics?.active_campaigns || 0}
                  </strong>
                </GlassCard>
                <GlassCard className="p-4 flex flex-col text-left gap-1" hoverEffect={false}>
                  <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Member Rating</span>
                  <strong className={`text-2xl font-black flex items-center gap-1 ${
                    (metrics?.issues_resolved || 0) === 0 ? 'text-slate-400 dark:text-slate-500' : 'text-amber-500'
                  }`}>
                    {(metrics?.issues_resolved || 0) === 0 ? (
                      <span className="text-xs font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-900/50 px-2 py-0.5 rounded-md">Not Started</span>
                    ) : (
                      <>★ {parseFloat(metrics?.rating || 5.00).toFixed(2)}</>
                    )}
                  </strong>
                </GlassCard>
              </>
            )}
          </div>

          {/* 2. Official Timeline History */}
          <GlassCard className="p-6 flex flex-col gap-4 text-left relative" hoverEffect={false}>
            <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-850 pb-3">
              <h3 className="font-extrabold text-base text-slate-800 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-cyan-400" />
                Commissioning Timeline
              </h3>
              <span className="text-[9px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-widest font-mono">
                Decryption Log Sync
              </span>
            </div>

            <div className="relative border-l border-slate-200/60 dark:border-slate-800/80 pl-6 ml-2 flex flex-col gap-6 py-2">
              {metrics?.timeline && metrics.timeline.length > 0 ? (
                metrics.timeline.map((item, idx) => (
                  <div key={idx} className="relative group text-left">
                    {/* Ring dot marker */}
                    <div className="absolute -left-[30px] top-1 w-2.5 h-2.5 rounded-full border border-cyan-400 bg-white dark:bg-slate-900 shadow-glow-cyan" />
                    
                    <span className="text-[10px] font-bold text-cyan-500 font-mono block">
                      {item.date}
                    </span>
                    <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold mt-1">
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

          {/* 3. Verification Instructions Panel */}
          <div className="flex items-start gap-4 p-4 rounded-xl border border-cyan-500/10 bg-cyan-500/5 text-slate-600 dark:text-slate-350 text-xs leading-relaxed text-left">
            <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5 animate-pulse" />
            <div className="flex flex-col gap-1">
              <strong className="text-slate-800 dark:text-slate-200">How to execute validation scans?</strong>
              <p>State Coordinators, security teams, and student unions can scan your digital ID card code using their mobile terminals to load your certified digital governance profile, active stats, and resolved grievances metrics instantly.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
