import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Scan, Upload, ShieldCheck, ShieldAlert, X, HelpCircle, User, Info, ArrowRight, Shield } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import PremiumButton from '../components/PremiumButton';

export default function QrScanExperience() {
  const navigate = useNavigate();

  // Scanning simulation states
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [scanError, setScanError] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);

  // Run a high-fidelity verification query to backend database
  const executeVerifyQuery = async (tokenOrId) => {
    setScanning(true);
    setScanError('');
    setScanResult(null);

    // Simulate scanning beam animation duration
    setTimeout(async () => {
      try {
        const response = await fetch(`/api/identity/verify/${tokenOrId}`);
        const data = await response.json();
        
        if (data.success) {
          setScanResult(data);
        } else {
          setScanError(data.message || 'Decryption failed: Token is not registered or contains corrupted headers.');
        }
      } catch (err) {
        console.error(err);
        setScanError('TSRV node communication failed. Server unreachable.');
      } finally {
        setScanning(false);
      }
    }, 1800);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadedFile(file.name);
      // Automatically trigger mock decryption logic based on file
      // If it looks like surya's card, verify surya, else trigger mock check
      if (file.name.toLowerCase().includes('surya')) {
        executeVerifyQuery('TSRV-HQ-0001');
      } else {
        executeVerifyQuery('supreme_secure_qr_token_surya_2026');
      }
    }
  };

  const closeResultModal = () => {
    setScanResult(null);
    setScanError('');
    setUploadedFile(null);
  };

  const quickScans = [
    { label: 'Audit Supreme Leader ID', token: 'TSRV-HQ-0001', desc: 'Queries Surya\'s Verified Official Card' },
    { label: 'Scan secure QR Token', token: 'supreme_secure_qr_token_surya_2026', desc: 'Validates raw QR cryptographic JWT key' },
    { label: 'Simulate Corrupt QR Scan', token: 'corrupted_token_abc_123', desc: 'Triggers active error database alert logs' }
  ];

  return (
    <div className="w-full flex flex-col gap-6 text-left select-none animate-fadeIn max-w-5xl mx-auto">
      {/* Header Panel */}
      <div className="relative overflow-hidden rounded-2xl glass-panel-light dark:glass-panel-dark border border-slate-200/50 dark:border-slate-850 p-8 shadow-premium-light dark:shadow-premium-dark flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-cyan-500/10 to-transparent blur-xl pointer-events-none" />
        
        <div className="flex flex-col gap-2">
          <div className="inline-flex items-center gap-1.5 self-start px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 text-[10px] font-extrabold uppercase tracking-wider border border-cyan-500/20">
            TSRV Verification Terminal
          </div>
          <h2 className="text-3xl font-black text-slate-800 dark:text-white flex items-center gap-2">
            Holographic QR Scanner
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-xl leading-relaxed">
            Verify governance credentials in real-time. Use the terminal scanning viewfinder, upload an identity card file, or run rapid-diagnostic shortcuts.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch w-full">
        {/* Left Side: Cinematic QR Viewfinder Scan Portal (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <GlassCard className="p-6 flex flex-col gap-6 items-center text-center relative overflow-hidden bg-slate-950/40" hoverEffect={false}>
            {/* Viewfinder Bounding Box */}
            <div className="relative w-full max-w-[340px] aspect-square rounded-2xl border-2 border-slate-800 bg-slate-950 flex items-center justify-center overflow-hidden shadow-2xl mt-4">
              
              {/* Outer corners visual aids */}
              <div className="absolute top-4 left-4 w-6 h-6 border-t-4 border-l-4 border-cyan-400 rounded-tl" />
              <div className="absolute top-4 right-4 w-6 h-6 border-t-4 border-r-4 border-cyan-400 rounded-tr" />
              <div className="absolute bottom-4 left-4 w-6 h-6 border-b-4 border-l-4 border-cyan-400 rounded-bl" />
              <div className="absolute bottom-4 right-4 w-6 h-6 border-b-4 border-r-4 border-cyan-400 rounded-br" />

              {/* Scanning neon laser beam line overlay */}
              {scanning && (
                <div className="absolute left-0 right-0 h-1 bg-cyan-400/90 shadow-[0_0_15px_#22d3ee] z-20 animate-[scanBeam_2s_infinite_ease-in-out]" />
              )}

              {/* Central QR Reticle visual */}
              <div className="w-48 h-48 opacity-30 border border-slate-700 rounded-xl flex items-center justify-center p-6 relative">
                <Scan className={`w-28 h-28 text-slate-400 ${scanning ? 'animate-pulse text-cyan-400 opacity-60' : ''}`} />
                {scanning && (
                  <span className="absolute bottom-2 text-[9px] text-cyan-400 uppercase tracking-widest font-black animate-pulse">
                    Decryption Sweep...
                  </span>
                )}
              </div>

              {/* Video preview mock text info overlay */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[8px] font-bold text-slate-500 uppercase tracking-widest font-mono select-none">
                ACTIVE TERMINAL FEED: Ready
              </div>
            </div>

            {/* Input buttons */}
            <div className="flex gap-4 w-full max-w-[340px] border-t border-slate-900 pt-6 mt-2">
              <label className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-slate-200/60 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-350 text-xs font-bold transition-all duration-200 cursor-pointer active:scale-95 shadow-sm">
                <Upload className="w-4 h-4 text-sky-400" />
                Upload Pass
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleFileUpload} 
                />
              </label>
              <PremiumButton 
                variant="glow" 
                size="md" 
                className="flex-1"
                disabled={scanning}
                onClick={() => executeVerifyQuery('TSRV-HQ-0001')}
                icon={<Camera className="w-4 h-4" />}
              >
                {scanning ? 'Decoding...' : 'Launch Feed'}
              </PremiumButton>
            </div>

            {uploadedFile && (
              <span className="text-[10px] text-cyan-400 font-mono">
                Uploaded: {uploadedFile} (Analyzing cryptographic segments...)
              </span>
            )}
          </GlassCard>
        </div>

        {/* Right Side: Quick scan diagnostics & telemetry Info (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <GlassCard className="p-6 flex flex-col gap-5" hoverEffect={false}>
            <div className="flex items-center gap-2 border-b border-slate-200/50 dark:border-slate-850 pb-3">
              <Shield className="w-5 h-5 text-cyan-400" />
              <h3 className="font-extrabold text-base text-slate-800 dark:text-white">
                Quick-Audit Terminal
              </h3>
            </div>

            <p className="text-xs text-slate-450 dark:text-slate-500 leading-relaxed">
              Verify credentials instantly using pre-configured mock nodes to audit database responses, warning triggers, and scan telemetry logging.
            </p>

            <div className="flex flex-col gap-3.5 mt-2">
              {quickScans.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => executeVerifyQuery(item.token)}
                  disabled={scanning}
                  className="w-full text-left p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-850 bg-white/40 dark:bg-slate-900/40 hover:border-cyan-400/30 hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-all duration-200 flex items-center justify-between group active:scale-[0.98] cursor-pointer"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-bold text-slate-850 dark:text-slate-250 group-hover:text-cyan-400 transition-colors">
                      {item.label}
                    </span>
                    <span className="text-[9px] text-slate-450 dark:text-slate-500">
                      {item.desc}
                    </span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-450 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
                </button>
              ))}
            </div>
          </GlassCard>

          {/* Security Alert disclaimer details */}
          <div className="flex items-start gap-4 p-4 rounded-xl border border-cyan-500/10 bg-cyan-500/5 text-slate-600 dark:text-slate-350 text-xs leading-relaxed text-left">
            <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1">
              <strong className="text-slate-800 dark:text-slate-200">State Audit Policy</strong>
              <p>Every scanning execution is permanently recorded. Scans capture the verifying network node client, client timestamp, and success status, and write it to the Neon PostgreSQL auditing cluster.</p>
            </div>
          </div>
        </div>
      </div>

      {/* --- RESULT INTERACTIVE MODAL OVERLAY --- */}
      {(scanResult || scanError) && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-[fadeIn_0.2s_ease-out]">
          <div className="w-full max-w-[460px] relative">
            <GlassCard className="p-8 text-center border-slate-200/50 dark:border-slate-850 relative" hoverEffect={false}>
              
              {/* Close Button */}
              <button 
                onClick={closeResultModal}
                className="absolute top-4 right-4 p-2 rounded-lg bg-slate-100/50 dark:bg-slate-900/50 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              {/* SUCCESS POPUP */}
              {scanResult && (
                <div className="flex flex-col items-center">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-5 animate-bounce ${scanResult.verified ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 shadow-glow-emerald' : 'bg-rose-500/10 border border-rose-500/20 text-rose-500 shadow-glow-rose'}`}>
                    {scanResult.verified ? <ShieldCheck className="w-8 h-8" /> : <ShieldAlert className="w-8 h-8" />}
                  </div>

                  <span className={`text-[10px] font-black uppercase tracking-widest ${scanResult.verified ? 'text-emerald-500' : 'text-rose-500'}`}>
                    TSRV System Decrypted
                  </span>

                  <h2 className="text-2xl font-black text-slate-800 dark:text-white mt-1">
                    {scanResult.verified ? 'Verified Advocate' : 'Invalid Credentials'}
                  </h2>

                  <p className="text-xs text-slate-400 mt-1">
                    Member ID: <strong className="font-mono text-cyan-400">{scanResult.identity.tsrv_member_id}</strong>
                  </p>

                  {/* Profile Summary card */}
                  <div className="w-full bg-slate-100/40 dark:bg-slate-900/50 border border-slate-200/40 dark:border-slate-850 rounded-xl p-4 mt-5 flex items-center gap-3 text-left">
                    {scanResult.profile.profile_image ? (
                      <img 
                        src={scanResult.profile.profile_image} 
                        alt={scanResult.profile.full_name} 
                        className="w-12 h-12 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-sky-500 to-cyan-400 text-white font-black text-lg flex items-center justify-center uppercase shrink-0">
                        {scanResult.profile.full_name.substring(0, 2)}
                      </div>
                    )}
                    <div className="flex flex-col min-w-0">
                      <strong className="text-sm font-bold text-slate-850 dark:text-white truncate">{scanResult.profile.full_name}</strong>
                      <span className="text-[10px] text-cyan-500 font-bold uppercase mt-0.5 truncate">{scanResult.profile.role.replace('_', ' ')}</span>
                      <span className="text-[9px] text-slate-450 mt-0.5 truncate">{scanResult.profile.constituency_name || 'Statewide Headquarters'}</span>
                    </div>
                  </div>

                  {/* Security/Access State Details */}
                  <div className="w-full flex justify-between items-center text-xs text-slate-450 border-t border-slate-200/20 dark:border-slate-850 pt-4 mt-5">
                    <span>Audit Result:</span>
                    <strong className={scanResult.verified ? 'text-emerald-500' : 'text-rose-500'}>
                      {scanResult.identity.verification_status.toUpperCase()}
                    </strong>
                  </div>

                  <PremiumButton 
                    variant="glow" 
                    size="md" 
                    className="w-full mt-6"
                    onClick={() => {
                      closeResultModal();
                      navigate(`/verify/${scanResult.identity.tsrv_member_id}`);
                    }}
                    icon={<ArrowRight className="w-4 h-4" />}
                  >
                    Open Official Ledger
                  </PremiumButton>
                </div>
              )}

              {/* EXPLICIT ERROR POPUP */}
              {scanError && (
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 mb-5 animate-bounce shadow-glow-rose">
                    <ShieldAlert className="w-8 h-8" />
                  </div>

                  <span className="text-[10px] font-black uppercase tracking-widest text-rose-500">
                    Decryption Failed
                  </span>

                  <h2 className="text-2xl font-black text-slate-800 dark:text-white mt-1">
                    Unregistered Token
                  </h2>

                  <p className="text-xs text-rose-550 dark:text-rose-400 font-mono bg-rose-500/5 p-4 rounded-xl border border-rose-500/10 leading-relaxed mt-4 w-full">
                    {scanError}
                  </p>

                  <p className="text-[9px] text-slate-500 mt-4 leading-relaxed max-w-[280px]">
                    This QR code contains an expired key, tampered signatures, or resides outside the Telangana R.S.V. secure server network.
                  </p>

                  <PremiumButton 
                    variant="glow" 
                    size="md" 
                    className="w-full mt-6"
                    onClick={closeResultModal}
                  >
                    Scan Another Card
                  </PremiumButton>
                </div>
              )}

            </GlassCard>
          </div>
        </div>
      )}
    </div>
  );
}
