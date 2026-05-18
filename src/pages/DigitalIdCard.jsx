import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, RefreshCw, FlipHorizontal, Download, Printer, ShieldAlert, ArrowRight, Sun, Moon, Info, PhoneCall } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import GlassCard from '../components/GlassCard';
import PremiumButton from '../components/PremiumButton';
import QRCode from 'qrcode';

export default function DigitalIdCard() {
  const { userProfile } = useAuth();
  
  // State for card telemetry
  const [identity, setIdentity] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  
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

  // Generate QR code locally as a data URL whenever the identity token changes
  useEffect(() => {
    if (identity?.qr_token) {
      const verifyUrl = `${window.location.origin}/#/verify/${identity.qr_token}`;
      QRCode.toDataURL(verifyUrl, {
        width: 300,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' },
        errorCorrectionLevel: 'H'
      })
        .then(url => setQrDataUrl(url))
        .catch(err => console.error('QR generation failed:', err));
    }
  }, [identity?.qr_token]);

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

  // Helper to load image safely inside canvas using CORS
  const loadImage = (src) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = src;
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
    });
  };

  // High-Resolution ID Card Side-by-Side PNG Mock Download Trigger
  const handleDownload = async () => {
    // Generate side-by-side front & back high-resolution layouts
    const canvas = document.createElement('canvas');
    canvas.width = 960;
    canvas.height = 320;
    const ctx = canvas.getContext('2d');

    // Load actual profile avatar and the locally-generated QR code
    const avatarUrl = userProfile?.profile_image || '';
    
    const [avatarImg, qrImg] = await Promise.all([
      avatarUrl ? loadImage(avatarUrl) : Promise.resolve(null),
      qrDataUrl ? loadImage(qrDataUrl) : Promise.resolve(null)
    ]);

    // Draw backdrop backing
    const bgGradient = ctx.createLinearGradient(0, 0, 960, 320);
    bgGradient.addColorStop(0, '#030712');
    bgGradient.addColorStop(0.5, '#0b0f19');
    bgGradient.addColorStop(1, '#020617');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, 960, 320);

    // Draw background neon particle glow highlights
    ctx.fillStyle = 'rgba(34, 211, 238, 0.03)';
    ctx.beginPath();
    ctx.arc(200, 100, 180, 0, 2 * Math.PI);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(760, 220, 180, 0, 2 * Math.PI);
    ctx.fill();

    // Helper to draw rounded rectangle cards
    const drawRoundedRect = (c, x, y, width, height, radius, fillStyle, strokeStyle, lineWidth) => {
      c.beginPath();
      c.moveTo(x + radius, y);
      c.lineTo(x + width - radius, y);
      c.quadraticCurveTo(x + width, y, x + width, y + radius);
      c.lineTo(x + width, y + height - radius);
      c.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      c.lineTo(x + radius, y + height);
      c.quadraticCurveTo(x, y + height, x, y + height - radius);
      c.lineTo(x, y + radius);
      c.quadraticCurveTo(x, y, x + radius, y);
      c.closePath();
      if (fillStyle) {
        c.fillStyle = fillStyle;
        c.fill();
      }
      if (strokeStyle) {
        c.strokeStyle = strokeStyle;
        c.lineWidth = lineWidth || 1;
        c.stroke();
      }
    };

    // Cards dimensions
    const cW = 420;
    const cH = 260;
    const cY = 30;
    const fX = 30;   // Front Card X
    const bX = 510;  // Back Card X

    // Card background linear gradient
    const cardBgGradient = (x) => {
      const g = ctx.createLinearGradient(x, cY, x + cW, cY + cH);
      g.addColorStop(0, '#090d16');
      g.addColorStop(1, '#111827');
      return g;
    };

    // ----------------------------------------------------
    // DRAW FRONT CARD FACE
    // ----------------------------------------------------
    drawRoundedRect(ctx, fX, cY, cW, cH, 16, cardBgGradient(fX), 'rgba(34, 211, 238, 0.25)', 2);

    // Front Card Header
    ctx.fillStyle = '#22d3ee';
    ctx.font = 'bold 13px Outfit, sans-serif';
    ctx.fillText('TELANGANA RAKSHANA SENA VIDYARTHI VIBHAGAM', fX + 24, cY + 36);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 7px Outfit, sans-serif';
    ctx.fillText('STATE STUDENT GOVERNANCE COUNCIL', fX + 24, cY + 48);

    // Dynamic verification status tag in header
    const statusText = identity?.verification_status?.toUpperCase() || 'ACTIVE';
    drawRoundedRect(ctx, fX + cW - 100, cY + 24, 76, 16, 8, 'rgba(16, 185, 129, 0.15)', '#10b981', 1);
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 8px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(statusText, fX + cW - 62, cY + 35);
    ctx.textAlign = 'left'; // Reset

    // Draw Profile Avatar image rounded or standard letter initials!
    const avatarX = fX + 24;
    const avatarY = cY + 68;
    const avatarSize = 64;

    if (avatarImg) {
      ctx.save();
      // Draw circular avatar masking path
      ctx.beginPath();
      ctx.arc(avatarX + avatarSize/2, avatarY + avatarSize/2, avatarSize/2, 0, 2 * Math.PI);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(avatarImg, avatarX, avatarY, avatarSize, avatarSize);
      ctx.restore();
      // Border outline
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(avatarX + avatarSize/2, avatarY + avatarSize/2, avatarSize/2, 0, 2 * Math.PI);
      ctx.stroke();
    } else {
      // Fallback: Custom Letter initial badge
      const initGrad = ctx.createLinearGradient(avatarX, avatarY, avatarX + avatarSize, avatarY + avatarSize);
      initGrad.addColorStop(0, '#0ea5e9');
      initGrad.addColorStop(1, '#22d3ee');
      drawRoundedRect(ctx, avatarX, avatarY, avatarSize, avatarSize, 12, initGrad, null);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px Outfit, sans-serif';
      ctx.textAlign = 'center';
      const initials = userProfile?.full_name ? userProfile.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'SU';
      ctx.fillText(initials, avatarX + avatarSize/2, avatarY + avatarSize/2 + 8);
      ctx.textAlign = 'left'; // Reset
    }

    // Name & Role
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px Outfit, sans-serif';
    ctx.fillText(userProfile?.full_name || 'Surya', avatarX + avatarSize + 16, avatarY + 22);

    ctx.fillStyle = '#22d3ee';
    ctx.font = 'bold 10px Outfit, sans-serif';
    const roleStr = userProfile?.role === 'student' ? 'STUDENT' : 'UNION MEMBER';
    ctx.fillText(roleStr, avatarX + avatarSize + 16, avatarY + 38);

    // Constituency & Campus Details (Clean wrapping to avoid overlap)
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '9px Outfit, sans-serif';
    
    const constituencyVal = `Constituency: ${userProfile?.constituency_name || 'State Headquarters'}`;
    const campusVal = `Campus: ${userProfile?.college_name || 'Statewide Council Node'}`;
    const issuedVal = `Issued: ${new Date(identity?.issued_at).toLocaleDateString()}`;

    ctx.fillText(constituencyVal, avatarX + avatarSize + 16, avatarY + 54);
    ctx.fillText(campusVal.length > 40 ? campusVal.substring(0, 38) + '...' : campusVal, avatarX + avatarSize + 16, avatarY + 68);
    ctx.fillText(issuedVal, avatarX + avatarSize + 16, avatarY + 82);

    // Front Card Footer
    ctx.fillStyle = '#94a3b8';
    ctx.font = '8px Outfit, sans-serif';
    ctx.fillText('TSRV SYSTEM NODE ID', fX + 24, cY + cH - 38);
    
    ctx.fillStyle = '#22d3ee';
    ctx.font = 'bold 15px Courier New, monospace';
    ctx.fillText(identity?.tsrv_member_id || 'TSRV-KHA-0001', fX + 24, cY + cH - 20);

    // Verified Seal Badge at bottom-right
    const badgeX = fX + cW - 74;
    const badgeY = cY + cH - 44;
    drawRoundedRect(ctx, badgeX, badgeY, 50, 26, 6, 'rgba(34, 211, 238, 0.08)', 'rgba(34, 211, 238, 0.25)', 1);
    ctx.fillStyle = '#22d3ee';
    ctx.font = 'bold 7px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('VERIFIED', badgeX + 25, badgeY + 11);
    ctx.fillText('SECURE', badgeX + 25, badgeY + 20);
    ctx.textAlign = 'left';

    // ----------------------------------------------------
    // DRAW BACK CARD FACE
    // ----------------------------------------------------
    drawRoundedRect(ctx, bX, cY, cW, cH, 16, cardBgGradient(bX), 'rgba(34, 211, 238, 0.25)', 2);

    // Back card Header
    ctx.fillStyle = '#22d3ee';
    ctx.font = 'bold 11px Outfit, sans-serif';
    ctx.fillText('TSRV SECURE DATABASE GRID', bX + 24, cY + 36);

    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 7px Outfit, sans-serif';
    ctx.fillText('SECURE REAL-TIME VERIFICATION PORTAL', bX + 24, cY + 48);

    // Gold security chip
    const chipX = bX + cW - 64;
    const chipY = cY + 24;
    const chipGrad = ctx.createLinearGradient(chipX, chipY, chipX + 40, chipY + 26);
    chipGrad.addColorStop(0, '#f59e0b');
    chipGrad.addColorStop(0.5, '#fbbf24');
    chipGrad.addColorStop(1, '#d97706');
    drawRoundedRect(ctx, chipX, chipY, 40, 26, 6, chipGrad, 'rgba(180, 83, 9, 0.3)', 1);
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(chipX + 20, chipY); ctx.lineTo(chipX + 20, chipY + 26);
    ctx.moveTo(chipX, chipY + 13); ctx.lineTo(chipX + 40, chipY + 13);
    ctx.stroke();

    // Centered Large QR Code block
    const qrSize = 100;
    const qrPosX = bX + (cW - qrSize) / 2;
    const qrPosY = cY + 62;

    // Draw white contrast base frame
    drawRoundedRect(ctx, qrPosX - 6, qrPosY - 6, qrSize + 12, qrSize + 12, 10, '#ffffff', 'rgba(34, 211, 238, 0.2)', 1.5);
    
    if (qrImg) {
      ctx.drawImage(qrImg, qrPosX, qrPosY, qrSize, qrSize);
    } else {
      // Fallback: draw placeholder QR grid
      ctx.fillStyle = '#000000';
      ctx.fillRect(qrPosX, qrPosY, qrSize, qrSize);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(qrPosX + 20, qrPosY + 20, 60, 60);
      ctx.fillStyle = '#000000';
      ctx.fillRect(qrPosX + 35, qrPosY + 35, 30, 30);
    }

    // Label below QR
    ctx.fillStyle = '#22d3ee';
    ctx.font = 'bold 7px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SCAN TO AUDIT PROFILE', bX + cW/2, qrPosY + qrSize + 22);

    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 5px Outfit, sans-serif';
    ctx.fillText('NEON POSTGRESQL HOSTED LEDGER', bX + cW/2, qrPosY + qrSize + 30);
    ctx.textAlign = 'left'; // Reset

    // Back card Footer
    ctx.fillStyle = '#64748b';
    ctx.font = '7px Outfit, sans-serif';
    ctx.fillText('System Node', bX + 24, cY + cH - 36);
    ctx.fillText('Node Region', bX + cW - 120, cY + cH - 36);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'bold 9px Outfit, sans-serif';
    ctx.fillText('TSRV-V2.5.0', bX + 24, cY + cH - 22);
    ctx.fillText(userProfile?.constituency_name || 'Statewide Command', bX + cW - 120, cY + cH - 22);

    // Trigger immediate link download
    const link = document.createElement('a');
    link.download = `${identity?.tsrv_member_id || 'TSRV_Card'}_DigitalID.png`;
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
              className={`w-full h-full rounded-2xl transition-transform duration-700 ease-out preserve-3d relative border border-white/10 shadow-2xl flex flex-col justify-between p-6 ${cardTheme === 'dark' ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}
              style={{
                transform: `${tiltStyle.transform} ${isFlipped ? 'rotateY(180deg)' : ''}`,
                boxShadow: cardTheme === 'dark' 
                  ? '0 25px 50px -12px rgba(34, 211, 238, 0.15)' 
                  : '0 25px 50px -12px rgba(14, 165, 233, 0.12)'
              }}
            >
              {/* --- FRONT SIDE --- */}
              <div 
                className={`absolute inset-0 p-6 flex flex-col justify-between backface-hidden bg-inherit rounded-2xl transition-all duration-300 ${
                  isFlipped ? 'z-10 opacity-0 pointer-events-none' : 'z-25 opacity-100'
                }`}
              >
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

                  {/* Holographic Security seal instead of small QR */}
                  <div className="flex flex-col items-center justify-center border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 rounded-lg shadow-glow-cyan/5 shrink-0 select-none">
                    <ShieldCheck className="w-5 h-5 text-cyan-400 animate-pulse" />
                    <span className="text-[6px] font-black uppercase tracking-widest text-cyan-400 mt-0.5">SECURE</span>
                  </div>
                </div>
              </div>

              {/* --- BACK SIDE --- */}
              <div 
                className={`absolute inset-0 p-6 flex flex-col justify-between backface-hidden rotate-y-180 bg-inherit rounded-2xl transition-all duration-300 ${
                  isFlipped ? 'z-25 opacity-100' : 'z-10 opacity-0 pointer-events-none'
                }`}
              >
                {/* Back card Header */}
                <div className="flex items-center justify-between border-b border-slate-200/10 dark:border-slate-800/50 pb-2">
                  <div className="flex flex-col text-left">
                    <span className="text-[9px] font-black tracking-widest text-cyan-400 uppercase">TSRV DATABASE GRID</span>
                    <span className="text-[6px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-widest mt-0.5 font-sans">Verification Portal</span>
                  </div>
                  <div className="w-8 h-6 rounded bg-gradient-to-tr from-amber-500 to-amber-300 relative overflow-hidden border border-amber-600/30 shrink-0">
                    <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-amber-700/40" />
                    <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-amber-700/40" />
                  </div>
                </div>

                {/* Back card Middle: LARGE CENTRAL QR CODE */}
                <div className="flex flex-col items-center justify-center my-auto gap-1.5 py-1.5">
                  <div className="p-1.5 rounded-xl bg-white border border-cyan-500/20 shadow-glow-cyan/15 flex items-center justify-center shrink-0">
                    {qrDataUrl ? (
                      <img 
                        src={qrDataUrl} 
                        alt="Scannable Security QR" 
                        className="w-24 h-24"
                      />
                    ) : (
                      <div className="w-24 h-24 flex items-center justify-center text-[8px] text-slate-400 animate-pulse">Generating...</div>
                    )}
                  </div>
                  <div className="flex flex-col items-center gap-0.5 mt-0.5">
                    <span className="text-[7px] font-black text-cyan-400 tracking-widest uppercase">SCAN TO AUDIT PROFILE</span>
                    <span className="text-[5px] text-slate-500 dark:text-slate-400 uppercase tracking-widest font-mono">NEON POSTGRESQL HOSTED LEDGER</span>
                  </div>
                </div>

                {/* Back Card Footer: Support info */}
                <div className="flex items-end justify-between border-t border-slate-200/10 dark:border-slate-800/50 pt-2">
                  <div className="flex flex-col text-left">
                    <span className="text-[6px] text-slate-450 dark:text-slate-500 uppercase tracking-widest">System Node</span>
                    <span className="text-[8px] font-extrabold text-slate-350 dark:text-slate-200 mt-0.5 font-mono">
                      TSRV-V2.5.0
                    </span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-[6px] text-slate-450 dark:text-slate-500 uppercase tracking-widest">Node Region</span>
                    <span className="text-[8px] font-extrabold text-slate-350 dark:text-slate-200 mt-0.5">
                      {userProfile?.constituency_name || 'Statewide Command'}
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
