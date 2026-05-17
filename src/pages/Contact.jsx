import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, ShieldAlert, CheckCircle, Lock, Sparkles, ChevronRight, ChevronLeft, UploadCloud, EyeOff, FileText, X, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import GlassCard from '../components/GlassCard';
import PremiumButton from '../components/PremiumButton';
import AnimatedSection from '../components/AnimatedSection';
import { uploadGrievanceMedia } from '../config/supabase';

export default function Contact() {
  const { user, userProfile } = useAuth();
  
  // Multi-step Wizard State
  const [step, setStep] = useState(1);
  
  // Complaint lodge state
  const [complaintSubmitted, setComplaintSubmitted] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Anti-Ragging');
  const [urgency, setUrgency] = useState('Medium');
  const [description, setDescription] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [proofFiles, setProofFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [assignedTicketId, setAssignedTicketId] = useState('');

  // Anonymous inquiry state
  const [anonName, setAnonName] = useState('');
  const [anonEmail, setAnonEmail] = useState('');
  const [anonMsg, setAnonMsg] = useState('');
  const [anonSubmitted, setAnonSubmitted] = useState(false);

  const handleNextStep = () => {
    if (step === 1 && !category) return;
    if (step === 2 && (!title || !description)) return;
    setStep(prev => Math.min(prev + 1, 4));
  };

  const handlePrevStep = () => {
    setStep(prev => Math.max(prev - 1, 1));
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files).filter(f => f.size <= 5 * 1024 * 1024); // max 5MB
      setProofFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (indexToRemove) => {
    setProofFiles(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleLodgeComplaint = async (e) => {
    e.preventDefault();
    if (!title || !description) return;

    setSubmitting(true);
    setErrorMsg('');
    try {
      const uploadedProofs = [];
      
      // Upload grievance attachments sequentially to Supabase
      if (proofFiles.length > 0) {
        for (const file of proofFiles) {
          const publicUrl = await uploadGrievanceMedia(file);
          uploadedProofs.push({ url: publicUrl, name: file.name });
        }
      }

      const token = localStorage.getItem('tsrv_session_token');
      const response = await fetch('/api/complaints', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title,
          description,
          category,
          urgency,
          anonymous,
          emergency_flag: urgency === 'Critical',
          proofs: uploadedProofs,
          collegeId: userProfile?.college_id || null,
          constituencyId: userProfile?.constituency_id || null
        })
      });

      const data = await response.json();
      if (data.success) {
        setComplaintSubmitted(true);
        setAssignedTicketId(data.complaint.id);
        
        // Reset state
        setTitle('');
        setDescription('');
        setProofFiles([]);
        setAnonymous(false);
        setStep(1);
      } else {
        setErrorMsg(data.message || 'Failed to lodge official complaint.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to connect to regional database nodes.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAnonSubmit = (e) => {
    e.preventDefault();
    if (!anonName || !anonMsg) return;
    setAnonSubmitted(true);
  };

  const isEmergency = urgency === 'Critical';

  return (
    <div className="w-full flex flex-col gap-16 py-4 text-left animate-fadeIn">
      
      {/* Header Banner */}
      <AnimatedSection direction="up" className="text-center max-w-3xl mx-auto flex flex-col gap-4">
        <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400 tracking-widest uppercase flex items-center justify-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          CONNECT WITH US
        </span>
        <h1 className="fluid-heading-2 font-black text-slate-850 dark:text-white leading-tight text-center">
          TSRV Statewide Helplines
        </h1>
        <p className="text-base sm:text-lg text-slate-500 dark:text-slate-400 leading-relaxed text-center">
          Are you seeking campus representation, planning a college campaign, or looking to schedule custom legal advice? Reach out to state board advisors directly.
        </p>
      </AnimatedSection>

      {/* Grid of contact details & forms */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-stretch w-full">
        
        {/* Contact Info Column */}
        <div className="flex flex-col gap-6">
          <h2 className="font-extrabold text-xl text-slate-850 dark:text-white border-b border-slate-200/50 dark:border-slate-850 pb-4">
            State Headquarters Contacts
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <GlassCard className="p-5 flex flex-col gap-3">
              <Phone className="w-5 h-5 text-cyan-500" />
              <div>
                <span className="block text-xs font-bold text-slate-400 uppercase">Emergency Anti-Ragging</span>
                <a href="tel:18004258778" className="text-sm font-extrabold text-slate-800 dark:text-white hover:text-cyan-500">1800-425-TSRV</a>
              </div>
            </GlassCard>

            <GlassCard className="p-5 flex flex-col gap-3">
              <Phone className="w-5 h-5 text-cyan-500" />
              <div>
                <span className="block text-xs font-bold text-slate-400 uppercase">Office Operations Hub</span>
                <span className="text-sm font-extrabold text-slate-800 dark:text-white">+91 80088 TSRV1</span>
              </div>
            </GlassCard>

            <GlassCard className="p-5 flex flex-col gap-3">
              <Mail className="w-5 h-5 text-cyan-500" />
              <div>
                <span className="block text-xs font-bold text-slate-400 uppercase">General Inquiries</span>
                <a href="mailto:support@tsrv.org" className="text-sm font-extrabold text-slate-800 dark:text-white hover:text-cyan-500">support@tsrv.org</a>
              </div>
            </GlassCard>

            <GlassCard className="p-5 flex flex-col gap-3">
              <MapPin className="w-5 h-5 text-cyan-500" />
              <div>
                <span className="block text-xs font-bold text-slate-400 uppercase">State Secretariat</span>
                <span className="text-xs font-extrabold text-slate-800 dark:text-white">Basheerbagh, Hyderabad</span>
              </div>
            </GlassCard>
          </div>

          <GlassCard className="p-6 flex items-start gap-4 border-l-2 border-rose-500 bg-rose-500/5">
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500 shrink-0 shadow-glow-rose">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-extrabold text-sm text-slate-850 dark:text-white">Reporting Emergency Physical Safety Hazards?</span>
              <p className="text-xs text-slate-500 leading-relaxed">
                Do not wait for standard ticket escalation! Activate the emergency anti-ragging squad hotline directly at **1800-425-TSRV** for JNTU/OU region dispatch.
              </p>
            </div>
          </GlassCard>
        </div>

        {/* Dynamic Secure Cinematic Multi-Step Lodge Card */}
        <div className="w-full">
          <GlassCard 
            hoverEffect={false} 
            className={`p-8 relative transition-all duration-700 ease-in-out ${isEmergency && !complaintSubmitted && user ? 'shadow-glow-rose border-rose-500/40 bg-rose-500/5 dark:bg-rose-500/5' : ''}`}
          >
            
            {user ? (
              // 1. Logged in official complaint lodging
              complaintSubmitted ? (
                <div className="text-center py-10 flex flex-col items-center gap-4 animate-scaleUp">
                  <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center text-green-500 shadow-glow-green">
                    <CheckCircle className="w-10 h-10" />
                  </div>
                  <h3 className="font-extrabold text-xl text-slate-850 dark:text-white">
                    Grievance Lodged Securely
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm text-center">
                    Grievance ticket **#{assignedTicketId}** successfully registered in Neon PostgreSQL. Regional leaders have been dispatched.
                  </p>
                  <PremiumButton 
                    variant="secondary" 
                    size="sm" 
                    className="mt-4"
                    onClick={() => {
                      setComplaintSubmitted(false);
                      setAssignedTicketId('');
                    }}
                  >
                    Lodge Another Incident
                  </PremiumButton>
                </div>
              ) : (
                <div className="flex flex-col gap-6 animate-scaleUp">
                  {/* Form Header */}
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className={`font-extrabold text-xl flex items-center gap-2 ${isEmergency ? 'text-rose-500' : 'text-slate-850 dark:text-white'}`}>
                        {isEmergency ? <AlertTriangle className="w-6 h-6 animate-pulse" /> : <ShieldAlert className="w-6 h-6 text-cyan-500" />}
                        {isEmergency ? 'Critical Emergency Dispatch' : 'Grievance Resolution Lodge'}
                      </h3>
                      <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">
                        Secured by verified coordinates: {userProfile?.college_name || userProfile?.constituency_name || 'State Scope'}
                      </p>
                    </div>
                    {/* Progress Indicator */}
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4].map(s => (
                        <div key={s} className={`w-2 h-2 rounded-full transition-colors duration-300 ${step === s ? (isEmergency ? 'bg-rose-500 shadow-glow-rose' : 'bg-cyan-500 shadow-glow-cyan') : (step > s ? 'bg-cyan-500/50' : 'bg-slate-300 dark:bg-slate-700')}`} />
                      ))}
                    </div>
                  </div>

                  {errorMsg && (
                    <div className="p-3 text-xs bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-xl">
                      {errorMsg}
                    </div>
                  )}

                  <div className="relative min-h-[280px]">
                    {/* STEP 1: Classification & Urgency */}
                    {step === 1 && (
                      <div className="flex flex-col gap-5 animate-fadeIn">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Grievance Category</label>
                          <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full p-3.5 rounded-xl border bg-white/40 dark:bg-slate-900/40 text-sm focus:outline-none focus:border-cyan-400 border-slate-200/60 dark:border-slate-800 text-slate-850 dark:text-slate-100 transition-colors"
                          >
                            <option value="Anti-Ragging">Anti-Ragging</option>
                            <option value="Harassment">Harassment</option>
                            <option value="Faculty Issues">Faculty Issues</option>
                            <option value="Infrastructure Problems">Infrastructure Problems</option>
                            <option value="Fee Issues">Fee Issues</option>
                            <option value="Hostel Issues">Hostel Issues</option>
                            <option value="Transport Problems">Transport Problems</option>
                            <option value="Safety Issues">Safety Issues</option>
                            <option value="Administration Problems">Administration Problems</option>
                            <option value="Abuse">Abuse</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Incident Urgency Stage</label>
                          <div className="grid grid-cols-2 gap-3">
                            {['Low', 'Medium', 'High', 'Critical'].map(level => (
                              <button
                                key={level}
                                type="button"
                                onClick={() => setUrgency(level)}
                                className={`p-3 rounded-xl border text-sm font-bold transition-all ${urgency === level ? (level === 'Critical' ? 'bg-rose-500 text-white border-rose-500 shadow-glow-rose' : 'bg-cyan-500 text-white border-cyan-500 shadow-glow-cyan') : 'bg-white/40 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'}`}
                              >
                                {level}
                              </button>
                            ))}
                          </div>
                          {urgency === 'Critical' && (
                            <p className="text-[10px] text-rose-500 font-bold mt-2 animate-pulse flex items-center gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              Selecting Critical invokes the Emergency Panic Dispatch protocol.
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* STEP 2: Details & Anonymity */}
                    {step === 2 && (
                      <div className="flex flex-col gap-5 animate-fadeIn">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Incident Title</label>
                          <input
                            type="text"
                            placeholder="e.g. Hostels water infrastructure outage..."
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border bg-white/40 dark:bg-slate-900/40 text-sm focus:outline-none focus:border-cyan-400 border-slate-200/60 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Detailed Description</label>
                          <textarea
                            rows={3}
                            placeholder="Describe the incident in detail for local coordinate squad mobilization..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border bg-white/40 dark:bg-slate-900/40 text-sm focus:outline-none focus:border-cyan-400 border-slate-200/60 dark:border-slate-800 text-slate-850 dark:text-slate-100"
                          />
                        </div>

                        <div className="flex items-center justify-between p-3.5 rounded-xl border bg-slate-100/50 dark:bg-slate-900/50 border-slate-200/60 dark:border-slate-800">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${anonymous ? 'bg-cyan-500/10 text-cyan-500' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'}`}>
                              <EyeOff className="w-4 h-4" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-slate-800 dark:text-white">Protect My Identity</span>
                              <span className="text-[9px] text-slate-400">Masks your name from constituency leaders.</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setAnonymous(!anonymous)}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${anonymous ? 'bg-cyan-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                          >
                            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${anonymous ? 'translate-x-4' : 'translate-x-1'}`} />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* STEP 3: Proofs & Evidence */}
                    {step === 3 && (
                      <div className="flex flex-col gap-4 animate-fadeIn">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Attach Evidences (Optional)</label>
                          
                          {/* Custom Drag & Drop Area */}
                          <div className="relative border-2 border-dashed rounded-2xl border-slate-300 dark:border-slate-700 hover:border-cyan-500 dark:hover:border-cyan-400 transition-colors bg-white/30 dark:bg-slate-900/30 flex flex-col items-center justify-center p-8 gap-3 group">
                            <input
                              type="file"
                              multiple
                              accept="image/*,application/pdf"
                              onChange={handleFileChange}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <div className="p-3 rounded-full bg-cyan-500/10 text-cyan-500 group-hover:scale-110 transition-transform">
                              <UploadCloud className="w-6 h-6" />
                            </div>
                            <div className="text-center">
                              <span className="text-sm font-bold text-slate-700 dark:text-white block">Drag & Drop files here</span>
                              <span className="text-[10px] text-slate-400 uppercase tracking-wider">Up to 5MB (JPG, PNG, PDF)</span>
                            </div>
                          </div>
                        </div>

                        {/* File Preview List */}
                        {proofFiles.length > 0 && (
                          <div className="flex flex-col gap-2 max-h-[140px] overflow-y-auto pr-1 custom-sidebar-scrollbar">
                            {proofFiles.map((file, idx) => (
                              <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg border bg-white/50 dark:bg-slate-850/50 border-slate-200/50 dark:border-slate-800">
                                <div className="flex items-center gap-2 min-w-0">
                                  <FileText className="w-4 h-4 text-cyan-500 shrink-0" />
                                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{file.name}</span>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                  <span className="text-[9px] text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                                  <button type="button" onClick={() => removeFile(idx)} className="text-rose-500 hover:text-rose-600 p-1">
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* STEP 4: Review & Submit */}
                    {step === 4 && (
                      <div className="flex flex-col gap-4 animate-fadeIn">
                        <div className={`p-5 rounded-xl border ${isEmergency ? 'bg-rose-500/10 border-rose-500/20' : 'bg-slate-100/50 dark:bg-slate-900/50 border-slate-200/60 dark:border-slate-800'}`}>
                          <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-white mb-3">Submission Summary</h4>
                          
                          <div className="flex flex-col gap-2.5 text-sm">
                            <div className="flex justify-between border-b border-slate-200/50 dark:border-slate-850 pb-2">
                              <span className="text-slate-500 dark:text-slate-400">Category:</span>
                              <span className="font-bold text-slate-800 dark:text-white">{category}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-200/50 dark:border-slate-850 pb-2">
                              <span className="text-slate-500 dark:text-slate-400">Urgency:</span>
                              <span className={`font-black uppercase ${isEmergency ? 'text-rose-500' : 'text-cyan-500'}`}>{urgency}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-200/50 dark:border-slate-850 pb-2">
                              <span className="text-slate-500 dark:text-slate-400">Identity Mode:</span>
                              <span className="font-bold text-slate-800 dark:text-white">{anonymous ? 'Masked (Anonymous)' : 'Public Advocate'}</span>
                            </div>
                            <div className="flex justify-between pb-1">
                              <span className="text-slate-500 dark:text-slate-400">Attachments:</span>
                              <span className="font-bold text-slate-800 dark:text-white">{proofFiles.length} files attached</span>
                            </div>
                          </div>
                        </div>

                        <PremiumButton 
                          type="button" 
                          variant="primary" 
                          size="md" 
                          className={`w-full mt-2 ${isEmergency ? 'bg-rose-500 hover:bg-rose-600 shadow-glow-rose before:from-rose-400 before:to-rose-600' : ''}`}
                          disabled={submitting}
                          onClick={handleLodgeComplaint}
                        >
                          {submitting ? 'Transmitting Evidences to Cloud...' : (isEmergency ? 'Trigger Emergency Dispatch' : 'Lodge Grievance Incident')}
                        </PremiumButton>
                      </div>
                    )}
                  </div>

                  {/* Wizard Footer Controls */}
                  {step < 4 && (
                    <div className="flex items-center justify-between mt-2 pt-4 border-t border-slate-200/50 dark:border-slate-850">
                      <button 
                        type="button" 
                        onClick={handlePrevStep}
                        className={`text-xs font-bold flex items-center gap-1 transition-colors ${step === 1 ? 'opacity-0 pointer-events-none' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}
                      >
                        <ChevronLeft className="w-4 h-4" /> Back
                      </button>
                      <PremiumButton 
                        type="button" 
                        variant="secondary" 
                        size="sm" 
                        onClick={handleNextStep}
                        disabled={(step === 1 && !category) || (step === 2 && (!title || !description))}
                      >
                        Proceed <ChevronRight className="w-4 h-4" />
                      </PremiumButton>
                    </div>
                  )}

                </div>
              )
            ) : (
              // 2. Anonymous / Guest fallback inquiry lodge
              anonSubmitted ? (
                <div className="text-center py-10 flex flex-col items-center gap-4 animate-scaleUp">
                  <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center text-green-500 shadow-glow-green">
                    <CheckCircle className="w-10 h-10" />
                  </div>
                  <h3 className="font-extrabold text-xl text-slate-850 dark:text-white">
                    Inquiry Transmitted
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm text-center">
                    Thank you, **{anonName}**. Your message has been logged securely.
                  </p>
                  <PremiumButton 
                    variant="secondary" 
                    size="sm" 
                    onClick={() => {
                      setAnonSubmitted(false);
                      setAnonName('');
                      setAnonEmail('');
                      setAnonMsg('');
                    }}
                  >
                    Transmit Another Inquiry
                  </PremiumButton>
                </div>
              ) : (
                <form onSubmit={handleAnonSubmit} className="flex flex-col gap-4 animate-scaleUp">
                  <h3 className="font-extrabold text-lg text-slate-850 dark:text-white flex items-center gap-2">
                    <Mail className="w-5 h-5 text-cyan-500" />
                    Secure Inquiry Terminal
                  </h3>

                  <div className="p-3 text-xs bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 rounded-xl flex items-center gap-2">
                    <Lock className="w-4 h-4 shrink-0" />
                    <span>Lodge official protected complaints by logging in first.</span>
                  </div>
                  
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Your Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Enter name"
                      value={anonName}
                      onChange={(e) => setAnonName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border bg-white/40 dark:bg-slate-900/40 text-sm focus:outline-none focus:border-cyan-400 border-slate-200/60 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="name@college.edu"
                      value={anonEmail}
                      onChange={(e) => setAnonEmail(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border bg-white/40 dark:bg-slate-900/40 text-sm focus:outline-none focus:border-cyan-400 border-slate-200/60 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Message Content</label>
                    <textarea
                      rows={4}
                      required
                      placeholder="Describe your inquiry details..."
                      value={anonMsg}
                      onChange={(e) => setAnonMsg(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border bg-white/40 dark:bg-slate-900/40 text-sm focus:outline-none focus:border-cyan-400 border-slate-200/60 dark:border-slate-800 text-slate-850 dark:text-slate-100"
                    />
                  </div>

                  <PremiumButton 
                    type="submit" 
                    variant="primary" 
                    size="md" 
                    className="w-full mt-2"
                  >
                    Transmit Inquiry Message
                  </PremiumButton>
                </form>
              )
            )}

          </GlassCard>
        </div>

      </section>

    </div>
  );
}
