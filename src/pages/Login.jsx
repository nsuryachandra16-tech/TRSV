import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Key, Mail, Lock, ShieldAlert, ArrowRight, Fingerprint } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import GlassCard from '../components/GlassCard';
import PremiumButton from '../components/PremiumButton';

export default function Login() {
  const navigate = useNavigate();
  const { 
    login, 
    resetPassword, 
    confirmResetPassword, 
    currentUser, 
    userProfile,
    checkBiometricsAvailable,
    loginWithBiometrics,
    enableBiometricLogin 
  } = useAuth();

  // Biometrics States
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [biometricsConfigured, setBiometricsConfigured] = useState(false);
  const [enrolledUser, setEnrolledUser] = useState('');
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);
  const [tempCredentials, setTempCredentials] = useState(null);

  React.useEffect(() => {
    if (currentUser && userProfile) {
      if (userProfile.role === 'supreme_admin' || userProfile.role === 'dev') {
        navigate('/dashboard/command');
      } else if (userProfile.role === 'student') {
        navigate('/dashboard/student');
      } else {
        navigate('/dashboard/leader');
      }
    }
  }, [currentUser, userProfile, navigate]);

  React.useEffect(() => {
    const initBiometrics = async () => {
      const status = await checkBiometricsAvailable();
      if (status.isAvailable) {
        setBiometricsAvailable(true);
        if (status.isConfigured) {
          setBiometricsConfigured(true);
          setEnrolledUser(status.enrolledUser);
          if (status.enrolledUser) {
            setEmail(status.enrolledUser);
          }
        }
      }
    };
    initBiometrics();
  }, [checkBiometricsAvailable]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Password Recovery States
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetStep, setResetStep] = useState(1);
  const [resetOtp, setResetOtp] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');

  const redirectUser = (user) => {
    if (user.role === 'supreme_admin' || user.role === 'dev') {
      navigate('/dashboard/command');
    } else if (user.role === 'student') {
      navigate('/dashboard/student');
    } else {
      navigate('/dashboard/leader');
    }
  };

  const handleBiometricLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const user = await loginWithBiometrics();
      setLoading(false);
      redirectUser(user);
    } catch (err) {
      setLoading(false);
      console.warn('[Biometrics Login] Failed:', err.message);
      setError(err.message || 'Biometric authentication failed.');
    }
  };

  const handleOptInBiometrics = async () => {
    if (!tempCredentials) return;
    try {
      await enableBiometricLogin(tempCredentials.email, tempCredentials.password);
      setShowBiometricPrompt(false);
      redirectUser(tempCredentials.user);
    } catch (err) {
      console.error('[Biometrics Opt-In] Error:', err.message);
      setError('Biometric enrollment failed. Logging in normally...');
      setTimeout(() => {
        setShowBiometricPrompt(false);
        redirectUser(tempCredentials.user);
      }, 1500);
    }
  };

  const handleOptOutBiometrics = () => {
    setShowBiometricPrompt(false);
    if (tempCredentials) {
      redirectUser(tempCredentials.user);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login(email, password);
      
      // Prompt for biometric enrollment if supported but not configured for this user
      if (biometricsAvailable && (!biometricsConfigured || enrolledUser !== email)) {
        setTempCredentials({ email, password, user });
        setShowBiometricPrompt(true);
        setLoading(false);
      } else {
        setLoading(false);
        redirectUser(user);
      }
    } catch (err) {
      setLoading(false);
      console.error(err);
      setError(err.message || 'Access denied: Authentication failed.');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setResetError('');
    setResetSuccess('');
    setResetLoading(true);
    
    const cleanEmail = resetEmail.trim().toLowerCase();
    if (cleanEmail === 'admin@trsv.gov.in' || cleanEmail === 'admin@trsv.gov.in' || cleanEmail === 'supreme.admin@trsv.gov.in' || cleanEmail === 'supreme.admin@trsv.gov.in' || cleanEmail.endsWith('@trsv.gov.in') || cleanEmail.endsWith('@trsv.gov.in')) {
      setResetError('For safety purposes, admin credentials cannot be changed. Please contact Developer Suryachandra.');
      setResetLoading(false);
      return;
    }

    try {
      if (resetStep === 1) {
        await resetPassword(resetEmail);
        setResetSuccess('Decryption passkey reset OTP dispatched successfully! Please check your registered student inbox.');
        setResetStep(2);
        setResetLoading(false);
      } else {
        await confirmResetPassword(resetEmail, resetOtp, resetNewPassword);
        setResetSuccess('Your access passkey has been successfully reset! Directing to terminal login...');
        setResetLoading(false);
        setTimeout(() => {
          setShowResetModal(false);
          setResetSuccess('');
          setResetError('');
          setResetStep(1);
          setResetOtp('');
          setResetNewPassword('');
        }, 2500);
      }
    } catch (err) {
      setResetLoading(false);
      setResetError(err.message || 'Failed to execute password recovery protocol.');
    }
  };

  return (
    <div className="w-full min-h-[75vh] flex items-center justify-center py-6 px-4">
      <div className="w-full max-w-md">
        
        <GlassCard hoverEffect={false} className="p-8 relative">
          {/* Neon backing light flare */}
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-cyan-400/10 to-transparent blur-xl rounded-bl-full pointer-events-none" />
          
          <div className="flex flex-col items-center gap-2 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-cyan-400 flex items-center justify-center shadow-glow-cyan text-white">
              <Shield className="w-6 h-6" />
            </div>
            <h2 className="font-extrabold text-2xl text-slate-850 dark:text-white mt-1">
              Access Governance OS
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Provide credentials to sync your terminal
            </p>
          </div>

          {/* Premium diagnostic alert card */}
          {error && (
            <div className="mb-5 flex items-start gap-2.5 p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-500 text-xs text-left">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5 text-left">
            {/* Email Field */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="name@college.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl border bg-white/40 dark:bg-slate-900/40 text-sm focus:outline-none focus:border-cyan-400 border-slate-200/60 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Access Password</label>
                <button 
                  type="button" 
                  onClick={() => {
                    const cleanEmail = email.trim().toLowerCase();
                    if (cleanEmail === 'admin@trsv.gov.in' || cleanEmail === 'admin@trsv.gov.in' || cleanEmail === 'supreme.admin@trsv.gov.in' || cleanEmail === 'supreme.admin@trsv.gov.in' || cleanEmail.endsWith('@trsv.gov.in') || cleanEmail.endsWith('@trsv.gov.in')) {
                      setError('Admin credentials cannot be changed. Contact Developer: Suryachandra.');
                      return;
                    }
                    setResetEmail(email);
                    setShowResetModal(true);
                  }} 
                  className="text-[10px] font-semibold text-cyan-500 hover:underline cursor-pointer focus:outline-none"
                >
                  Forgot?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl border bg-white/40 dark:bg-slate-900/40 text-sm focus:outline-none focus:border-cyan-400 border-slate-200/60 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            {/* Sign in Trigger */}
            <PremiumButton 
              type="submit" 
              variant="primary" 
              size="md" 
              className="w-full mt-2"
              icon={loading ? null : <ArrowRight className="w-4 h-4" />}
              disabled={loading}
            >
              {loading ? 'Decrypting Credentials...' : 'Sign In to Terminal'}
            </PremiumButton>

            {biometricsConfigured && (
              <div className="flex flex-col items-center gap-2 mt-4 pt-4 border-t border-slate-200/20 dark:border-slate-800/40">
                <button
                  type="button"
                  onClick={handleBiometricLogin}
                  className="w-14 h-14 rounded-full flex items-center justify-center bg-gradient-to-tr from-cyan-500/15 to-sky-500/15 hover:from-cyan-500/25 hover:to-sky-500/25 border border-cyan-500/30 hover:border-cyan-400 text-cyan-400 hover:text-cyan-300 shadow-glow-cyan/25 hover:shadow-glow-cyan/50 transition-all duration-300 cursor-pointer active:scale-95 animate-[pulse_2s_infinite]"
                  title="Login with Biometrics"
                >
                  <Fingerprint className="w-7 h-7" />
                </button>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold">
                  Scan Fingerprint to Unlock
                </span>
              </div>
            )}

            <p className="text-center text-xs text-slate-400 mt-2">
              New to the state governance network?{' '}
              <Link to="/signup" className="font-semibold text-cyan-500 hover:underline">
                Create Profile
              </Link>
            </p>
          </form>
        </GlassCard>
      </div>

      {/* Password Reset Modal */}
      {showResetModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/75 backdrop-blur-md p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="w-full max-w-md animate-[scaleIn_0.2s_ease-out]">
            <div className="bg-white/98 dark:bg-slate-900/98 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 p-8 relative rounded-2xl shadow-2xl overflow-hidden">
              {/* Top light bar */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-sky-500 to-cyan-400" />
              
              <div className="flex flex-col items-center gap-2 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-cyan-400 flex items-center justify-center shadow-glow-cyan text-white">
                  <Key className="w-6 h-6 animate-pulse" />
                </div>
                <h3 className="font-extrabold text-xl text-slate-850 dark:text-white mt-1">
                  Recover Pass-key
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 text-center px-4 leading-relaxed">
                  Enter your authorized email to dispatch a secure decryption reset mailer
                </p>
              </div>

              {resetError && (
                <div className="mb-4 flex items-start gap-2.5 p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-450 text-xs text-left animate-[shake_0.3s_ease-in-out]">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{resetError}</span>
                </div>
              )}

              {resetSuccess && (
                <div className="mb-4 flex items-start gap-2.5 p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 text-xs text-left animate-[bounceIn_0.3s_ease-out]">
                  <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[9px] font-bold shrink-0 mt-0.5">✓</div>
                  <span>{resetSuccess}</span>
                </div>
              )}

              <form onSubmit={handleResetPassword} className="flex flex-col gap-4 text-left">
                {resetStep === 1 ? (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Registered Email</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="email"
                        required
                        placeholder="name@college.edu"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 rounded-xl border bg-white dark:bg-slate-950/60 text-sm focus:outline-none focus:border-cyan-400 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Registered Email</label>
                      <div className="relative opacity-60">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="email"
                          disabled
                          value={resetEmail}
                          className="w-full pl-11 pr-4 py-3 rounded-xl border bg-slate-100 dark:bg-slate-900 text-sm border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                        />
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-1.5 animate-[fadeIn_0.2s_ease-out]">
                      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">6-Digit Recovery OTP</label>
                      <div className="relative">
                        <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          required
                          maxLength={6}
                          placeholder="123456"
                          value={resetOtp}
                          onChange={(e) => setResetOtp(e.target.value)}
                          className="w-full pl-11 pr-4 py-3 rounded-xl border bg-white dark:bg-slate-950/60 text-sm focus:outline-none focus:border-cyan-400 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 tracking-[0.2em] font-mono text-center"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5 animate-[fadeIn_0.2s_ease-out]">
                      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">New Access Passkey</label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="password"
                          required
                          placeholder="••••••••••••"
                          value={resetNewPassword}
                          onChange={(e) => setResetNewPassword(e.target.value)}
                          className="w-full pl-11 pr-4 py-3 rounded-xl border bg-white dark:bg-slate-950/60 text-sm focus:outline-none focus:border-cyan-400 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="flex gap-3 mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowResetModal(false);
                      setResetSuccess('');
                      setResetError('');
                      setResetStep(1);
                      setResetOtp('');
                      setResetNewPassword('');
                    }}
                    className="flex-1 px-4 py-3 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-600 hover:text-slate-900 dark:text-slate-350 dark:hover:text-slate-100 text-xs font-bold transition-all duration-200"
                  >
                    Cancel
                  </button>
                  
                  <PremiumButton
                    type="submit"
                    variant="primary"
                    size="md"
                    className="flex-1"
                    disabled={resetLoading}
                  >
                    {resetLoading ? 'Processing...' : resetStep === 1 ? 'Send Code' : 'Reset Passkey'}
                  </PremiumButton>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Biometric Opt-In Enrollment Modal */}
      {showBiometricPrompt && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/75 backdrop-blur-md p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="w-full max-w-sm animate-[scaleIn_0.2s_ease-out]">
            <div className="bg-white/98 dark:bg-slate-900/98 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 p-8 relative rounded-2xl shadow-2xl overflow-hidden text-center">
              {/* Top light bar */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-sky-500 to-cyan-400" />
              
              <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-sky-500/20 to-cyan-400/20 border border-cyan-400/30 flex items-center justify-center text-cyan-400 shadow-glow-cyan mb-4">
                <Fingerprint className="w-8 h-8 animate-pulse" />
              </div>

              <h3 className="font-extrabold text-xl text-slate-850 dark:text-white">
                Enable Biometric Login?
              </h3>
              <p className="text-xs text-slate-550 dark:text-slate-400 mt-2 mb-6 leading-relaxed">
                Access your TRSV governance terminal faster next time by registering your fingerprint or face authentication.
              </p>

              <div className="flex flex-col gap-3">
                <PremiumButton
                  type="button"
                  variant="primary"
                  size="md"
                  className="w-full"
                  onClick={handleOptInBiometrics}
                >
                  Enable Secure Biometrics
                </PremiumButton>
                
                <button
                  type="button"
                  onClick={handleOptOutBiometrics}
                  className="w-full py-2.5 rounded-xl text-slate-400 hover:text-slate-350 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-850/40 transition-all duration-200"
                >
                  Skip for Now
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
