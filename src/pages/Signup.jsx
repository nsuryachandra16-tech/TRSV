import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Mail, Lock, User, Phone, ArrowRight, ShieldCheck, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import GlassCard from '../components/GlassCard';
import PremiumButton from '../components/PremiumButton';

export default function Signup() {
  const navigate = useNavigate();
  const { signup } = useAuth();

  const [formData, setFormData] = useState({ 
    name: '', 
    email: '', 
    phone: '',
    password: '' 
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // OTP Verification States
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpSuccessMsg, setOtpSuccessMsg] = useState('');

  const handleSendOtp = async () => {
    if (!formData.email || !formData.email.includes('@')) {
      setError('Please enter a valid email address before requesting an OTP.');
      return;
    }
    setError('');
    setSendingOtp(true);
    setOtpSuccessMsg('');
    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email })
      });
      const data = await response.json();
      if (data.success) {
        setOtpSent(true);
        if (data.otp) {
          setOtpSuccessMsg(`✨ Simulated Review Mode Active! OTP code: ${data.otp} (Auto-filled!)`);
          setOtpCode(data.otp);
        } else {
          setOtpSuccessMsg(data.message);
        }
      } else {
        setError(data.message || 'Failed to dispatch verification OTP.');
      }
    } catch (err) {
      setError('Failed to contact identity auth dispatch systems.');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length !== 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }
    setError('');
    setVerifyingOtp(true);
    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, code: otpCode })
      });
      const data = await response.json();
      if (data.success) {
        setIsEmailVerified(true);
        setOtpSent(false);
        setOtpSuccessMsg('Email successfully verified. Access keys activated.');
      } else {
        setError(data.message || 'Invalid verification code.');
      }
    } catch (err) {
      setError('Failed to contact identity verification servers.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!isEmailVerified) {
      setError('Please verify your email address via the 6-digit OTP first.');
      return;
    }

    setLoading(true);

    try {
      // 1. Authenticate and register user in relational database
      const profile = await signup(
        formData.email,
        formData.password,
        formData.name,
        formData.phone,
        null, // Selected inside Student Dashboard
        null, // Selected inside Student Dashboard
        null  // Profile image
      );
      
      setLoading(false);
      
      // Dynamic redirection
      if (profile.role === 'student') {
        navigate('/dashboard/student');
      } else {
        navigate('/dashboard/leader');
      }
    } catch (err) {
      setLoading(false);
      console.error(err);
      setError(err.message || 'Registration failed.');
    }
  };

  return (
    <div className="w-full min-h-[75vh] flex items-center justify-center py-6 px-4">
      <div className="w-full max-w-xl">
        
        <GlassCard hoverEffect={false} className="p-8 relative">
          {/* Neon backing light flare */}
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-cyan-400/10 to-transparent blur-xl rounded-bl-full pointer-events-none" />
          
          <div className="flex flex-col items-center gap-2 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-cyan-400 flex items-center justify-center shadow-glow-cyan text-white">
              <Shield className="w-6 h-6" />
            </div>
            <h2 className="font-extrabold text-2xl text-slate-850 dark:text-white mt-1">
              Enroll Advocacy Profile
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Create student credentials to join the statewide network
            </p>
          </div>

          {/* Premium diagnostic alert card */}
          {error && (
            <div className="mb-5 flex items-start gap-2.5 p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-500 text-xs text-left">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-left">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Full Name */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="Advocate Name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border bg-white/40 dark:bg-slate-900/40 text-sm focus:outline-none focus:border-cyan-400 border-slate-200/60 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email Address</label>
                  {!isEmailVerified && (
                    <button
                      type="button"
                      disabled={sendingOtp}
                      onClick={handleSendOtp}
                      className="text-[10px] font-bold text-cyan-500 hover:underline cursor-pointer focus:outline-none disabled:opacity-50"
                    >
                      {sendingOtp ? 'Sending OTP...' : (otpSent ? 'Resend OTP' : 'Send Verification OTP')}
                    </button>
                  )}
                  {isEmailVerified && (
                    <span className="text-[9px] font-black text-emerald-500 uppercase tracking-wider flex items-center gap-0.5">
                      <ShieldCheck className="w-3 h-3" /> Verified
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    disabled={isEmailVerified}
                    placeholder="name@college.edu"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border bg-white/40 dark:bg-slate-900/40 text-sm focus:outline-none focus:border-cyan-400 border-slate-200/60 dark:border-slate-800 text-slate-800 dark:text-slate-100 disabled:opacity-75"
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div className="flex flex-col gap-1 md:col-span-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Advocate Mobile Number</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="tel"
                    required
                    placeholder="9876543210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border bg-white/40 dark:bg-slate-900/40 text-sm focus:outline-none focus:border-cyan-400 border-slate-200/60 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>
            </div>

            {/* Email OTP Verification Input */}
            {otpSent && !isEmailVerified && (
              <div className="p-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5 flex flex-col gap-2.5 animate-scaleUp">
                <span className="text-[9px] font-black text-cyan-500 uppercase tracking-wider block">
                  Enter 6-Digit Verification Code
                </span>
                {otpSuccessMsg && (
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal">{otpSuccessMsg}</p>
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="e.g. 123456"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3 py-2 rounded-lg border bg-white/50 dark:bg-slate-950/40 text-center font-mono font-bold text-sm tracking-[4px] focus:outline-none focus:border-cyan-400 border-slate-200/60 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                  />
                  <PremiumButton
                    type="button"
                    variant="glow"
                    size="sm"
                    disabled={verifyingOtp}
                    onClick={handleVerifyOtp}
                  >
                    {verifyingOtp ? 'Verifying...' : 'Verify'}
                  </PremiumButton>
                </div>
              </div>
            )}
        
            {/* Password */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Access Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-11 pr-4 py-3 rounded-xl border bg-white/40 dark:bg-slate-900/40 text-sm focus:outline-none focus:border-cyan-400 border-slate-200/60 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            {/* Agreement Checklist */}
            <div className="flex items-start gap-2.5 mt-1">
              <input type="checkbox" required className="mt-1 rounded border-slate-300 dark:border-slate-800" />
              <p className="text-[10px] text-slate-450 leading-normal">
                I agree to the statewide student terms. I verify all entered academic information is correct and authentic under legal review.
              </p>
            </div>

            {/* Register trigger */}
            <PremiumButton 
              type="submit" 
              variant="primary" 
              size="md" 
              className="w-full mt-2"
              icon={loading ? null : <ArrowRight className="w-4 h-4" />}
              disabled={loading}
            >
              {loading ? 'Activating Profile Coordinates...' : 'Enroll Student Profile'}
            </PremiumButton>

            <p className="text-center text-xs text-slate-400 mt-2">
              Already have a profile logged?{' '}
              <Link to="/login" className="font-semibold text-cyan-500 hover:underline">
                Sign In
              </Link>
            </p>
          </form>
        </GlassCard>
      </div>
    </div>
  );
}
