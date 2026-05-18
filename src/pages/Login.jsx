import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Key, Mail, Lock, ShieldAlert, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import GlassCard from '../components/GlassCard';
import PremiumButton from '../components/PremiumButton';

export default function Login() {
  const navigate = useNavigate();
  const { login, resetPassword, confirmResetPassword } = useAuth();
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login(email, password);
      setLoading(false);

      // Perform dynamic redirection based on validated database role
      if (user.role === 'supreme_admin') {
        navigate('/dashboard/command');
      } else if (user.role === 'student') {
        navigate('/dashboard/student');
      } else {
        navigate('/dashboard/leader');
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
    </div>
  );
}
