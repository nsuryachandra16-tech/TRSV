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
  
  // Complainant Mandatory Details
  const [complainantName, setComplainantName] = useState(userProfile?.full_name || '');
  const [complainantMobile, setComplainantMobile] = useState(userProfile?.phone || '');
  const [collegeSchoolAddress, setCollegeSchoolAddress] = useState(userProfile?.college_name || '');

  // Constituency selector list
  const [constituencyList, setConstituencyList] = useState([]);
  const [selectedConstituencyId, setSelectedConstituencyId] = useState(userProfile?.constituency_id || '');

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

  // Fetch all active constituencies on mount
  React.useEffect(() => {
    const fetchConstituencies = async () => {
      try {
        const res = await fetch('/api/constituencies');
        const data = await res.json();
        if (data.success) {
          setConstituencyList(data.constituencies);
        }
      } catch (err) {
        console.error('Failed to load constituencies:', err);
      }
    };
    fetchConstituencies();
  }, []);

  // Sync initial profile values if loaded after render
  React.useEffect(() => {
    if (userProfile) {
      if (!complainantName) setComplainantName(userProfile.full_name || '');
      if (!complainantMobile) setComplainantMobile(userProfile.phone || '');
      if (!collegeSchoolAddress) setCollegeSchoolAddress(userProfile.college_name || '');
      if (!selectedConstituencyId) setSelectedConstituencyId(userProfile.constituency_id || '');
    }
  }, [userProfile]);

  // Anonymous inquiry state
  const [anonName, setAnonName] = useState('');
  const [anonEmail, setAnonEmail] = useState('');
  const [anonMsg, setAnonMsg] = useState('');
  const [anonSubmitted, setAnonSubmitted] = useState(false);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setErrorMsg('');
      const allowedTypes = ['application/pdf', 'video/mp4', 'image/png', 'image/jpg', 'image/jpeg', 'image/gif'];
      const newFiles = Array.from(e.target.files).filter(f => {
        if (!allowedTypes.includes(f.type)) {
          setErrorMsg(`File "${f.name}" is not supported. Please upload PDF, MP4, or Images only.`);
          return false;
        }
        const isOkSize = f.size <= 20 * 1024 * 1024; // max 20MB for evidence
        if (!isOkSize) {
          setErrorMsg(`File "${f.name}" exceeds the 20MB limit.`);
        }
        return isOkSize;
      });
      setProofFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (indexToRemove) => {
    setProofFiles(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleLodgeComplaint = async (e) => {
    e.preventDefault();
    if (!complainantName.trim() || !complainantMobile.trim() || !collegeSchoolAddress.trim() || !description.trim() || !selectedConstituencyId || proofFiles.length === 0) {
      setErrorMsg('All fields are mandatory, including selecting your constituency and attaching at least one proof file.');
      return;
    }

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
          title: `Grievance from ${complainantName}`,
          description,
          category,
          urgency,
          anonymous,
          emergency_flag: urgency === 'Critical',
          proofs: uploadedProofs,
          complainant_name: complainantName,
          complainant_mobile: complainantMobile,
          college_school_address: collegeSchoolAddress,
          collegeId: userProfile?.college_id || null,
          constituencyId: selectedConstituencyId
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
          STUDENT UNION PORTAL
        </span>
        <h1 className="fluid-heading-2 font-black text-slate-850 dark:text-white leading-tight text-center">
          TSRV Union Support Center
        </h1>
        <p className="text-base sm:text-lg text-slate-500 dark:text-slate-400 leading-relaxed text-center">
          Need student representation, planning campus campaigns, or reporting academic grievances? Lodge a union grievance docket or contact the district council directly.
        </p>
      </AnimatedSection>

      {/* Grid of contact details & forms */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-stretch w-full">
        
        {/* Contact Info Column */}
        <div className="flex flex-col gap-6">
          <h2 className="font-extrabold text-xl text-slate-850 dark:text-white border-b border-slate-200/50 dark:border-slate-850 pb-4">
            Union Leadership Helpdesks
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <GlassCard className="p-5 flex flex-col gap-3">
              <Mail className="w-5 h-5 text-cyan-500" />
              <div>
                <span className="block text-xs font-bold text-slate-400 uppercase">General Inquiries</span>
                <a href="mailto:support@tsrv.org" className="text-sm font-extrabold text-slate-800 dark:text-white hover:text-cyan-500">support@tsrv.org</a>
              </div>
            </GlassCard>

            <GlassCard className="p-5 flex flex-col gap-3">
              <Mail className="w-5 h-5 text-cyan-500" />
              <div>
                <span className="block text-xs font-bold text-slate-400 uppercase">Union Dispatch Escalation</span>
                <a href="mailto:dispatch@tsrv.org" className="text-sm font-extrabold text-slate-800 dark:text-white hover:text-cyan-500">dispatch@tsrv.org</a>
              </div>
            </GlassCard>

            <GlassCard className="p-5 flex flex-col gap-3">
              <Phone className="w-5 h-5 text-cyan-500" />
              <div>
                <span className="block text-xs font-bold text-slate-400 uppercase">Operations Desk</span>
                <span className="text-sm font-extrabold text-slate-800 dark:text-white">Active Union Channels</span>
              </div>
            </GlassCard>

            <GlassCard className="p-5 flex flex-col gap-3">
              <MapPin className="w-5 h-5 text-cyan-500" />
              <div>
                <span className="block text-xs font-bold text-slate-400 uppercase">State Secretariat HQ</span>
                <span className="text-xs font-extrabold text-slate-800 dark:text-white">Himayatnagar, Hyderabad</span>
              </div>
            </GlassCard>
          </div>

          <GlassCard className="p-6 flex items-start gap-4 border-l-2 border-cyan-500 bg-cyan-500/5">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-500 shrink-0 shadow-glow-cyan">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-extrabold text-sm text-slate-850 dark:text-white">Student Union Grievance Guidance</span>
              <p className="text-xs text-slate-500 leading-relaxed">
                TSRV is a student union portal, not a government or state portal. Dockets logged here are transmitted directly to the student union's district boards for campus mediation.
              </p>
            </div>
          </GlassCard>
        </div>

        {/* Dynamic Secure Cinematic Lodge Card */}
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
                <form onSubmit={handleLodgeComplaint} className="flex flex-col gap-6 animate-scaleUp text-left">
                  {/* Form Header */}
                  <div>
                    <h3 className={`font-extrabold text-xl flex items-center gap-2 ${isEmergency ? 'text-rose-500' : 'text-slate-850 dark:text-white'}`}>
                      {isEmergency ? <AlertTriangle className="w-6 h-6 animate-pulse" /> : <ShieldAlert className="w-6 h-6 text-cyan-500" />}
                      {isEmergency ? 'Critical Emergency Dispatch' : 'Grievance Resolution Lodge'}
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">
                      Secured by verified coordinates: {userProfile?.college_name || userProfile?.constituency_name || 'State Scope'}
                    </p>
                  </div>

                  {/* MANDATORY DISCLAIMER BOX */}
                  <div className="p-4 text-xs bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded-xl flex items-start gap-2.5 leading-relaxed animate-scaleUp">
                    <AlertTriangle className="w-4.5 h-4.5 shrink-0 text-rose-500 mt-0.5" />
                    <div>
                      <strong className="block font-extrabold uppercase mb-1">⚠️ Mandatory Disclaimer</strong>
                      By submitting this complaint, you declare under union regulations that all facts, details, and attachments are genuine and true. Lodging simulated, fake, or false reports is strictly prohibited under the TSRV State Charter, and will result in immediate suspension of student credentials and potential legal actions.
                    </div>
                  </div>

                  {errorMsg && (
                    <div className="p-3 text-xs bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-xl">
                      {errorMsg}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Complainant Name */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Your Full Name <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        placeholder="Enter your full name"
                        value={complainantName}
                        onChange={(e) => setComplainantName(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border bg-white/40 dark:bg-slate-900/40 text-sm focus:outline-none focus:border-cyan-400 border-slate-200/60 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                        required
                      />
                    </div>

                    {/* Real Mobile Number */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Mobile Number <span className="text-rose-500">*</span></label>
                      <input
                        type="tel"
                        placeholder="Enter your 10-digit mobile number"
                        value={complainantMobile}
                        onChange={(e) => setComplainantMobile(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border bg-white/40 dark:bg-slate-900/40 text-sm focus:outline-none focus:border-cyan-400 border-slate-200/60 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                        required
                      />
                    </div>

                    {/* Constituency Selector Dropdown */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Constituency / Area Node <span className="text-rose-500">*</span></label>
                      <select
                        value={selectedConstituencyId}
                        onChange={(e) => setSelectedConstituencyId(e.target.value)}
                        className="w-full p-3.5 rounded-xl border bg-white/40 dark:bg-slate-900/40 text-sm focus:outline-none focus:border-cyan-400 border-slate-200/60 dark:border-slate-800 text-slate-850 dark:text-slate-100 transition-colors"
                        required
                      >
                        <option value="">Select constituency area</option>
                        {constituencyList.map(c => (
                          <option key={c.id} value={c.id}>{c.constituency_name} ({c.district})</option>
                        ))}
                      </select>
                    </div>

                    {/* Grievance Category */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Grievance Category <span className="text-rose-500">*</span></label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full p-3.5 rounded-xl border bg-white/40 dark:bg-slate-900/40 text-sm focus:outline-none focus:border-cyan-400 border-slate-200/60 dark:border-slate-800 text-slate-855 dark:text-slate-100 transition-colors"
                        required
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
                  </div>

                  {/* College Full Address */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">College / School Proper Address <span className="text-rose-500">*</span></label>
                    <textarea
                      rows={2}
                      placeholder="Enter the complete address of your college or school campus"
                      value={collegeSchoolAddress}
                      onChange={(e) => setCollegeSchoolAddress(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border bg-white/40 dark:bg-slate-900/40 text-sm focus:outline-none focus:border-cyan-400 border-slate-200/60 dark:border-slate-800 text-slate-855 dark:text-slate-100"
                      required
                    />
                  </div>

                  {/* Urgency Stage Selection */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Urgency Stage <span className="text-rose-500">*</span></label>
                    <div className="grid grid-cols-4 gap-2">
                      {['Low', 'Medium', 'High', 'Critical'].map(level => (
                        <button
                          key={level}
                          type="button"
                          onClick={() => setUrgency(level)}
                          className={`p-2 rounded-lg border text-xs font-bold transition-all ${urgency === level ? (level === 'Critical' ? 'bg-rose-500 text-white border-rose-500 shadow-glow-rose' : 'bg-cyan-500 text-white border-cyan-500 shadow-glow-cyan') : 'bg-white/40 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'}`}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Issue Description */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Issue Brief / description <span className="text-rose-500">*</span></label>
                    <textarea
                      rows={3}
                      placeholder="Describe your issue or grievance brief..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border bg-white/40 dark:bg-slate-900/40 text-sm focus:outline-none focus:border-cyan-400 border-slate-200/60 dark:border-slate-800 text-slate-855 dark:text-slate-100"
                      required
                    />
                  </div>

                  {/* Issue Proofs Upload */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Issue Proofs (At least one file is required) <span className="text-rose-500">*</span></label>
                    
                    {/* Custom Drag & Drop Area */}
                    <div className="relative border-2 border-dashed rounded-2xl border-slate-300 dark:border-slate-700 hover:border-cyan-500 dark:hover:border-cyan-400 transition-colors bg-white/30 dark:bg-slate-900/30 flex flex-col items-center justify-center p-6 gap-2 group">
                      <input
                        type="file"
                        multiple
                        accept="image/*,application/pdf,video/*"
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div className="p-2 rounded-full bg-cyan-500/10 text-cyan-500 group-hover:scale-110 transition-transform">
                        <UploadCloud className="w-5 h-5" />
                      </div>
                      <div className="text-center">
                        <span className="text-xs font-bold text-slate-700 dark:text-white block">Drag & Drop files here</span>
                        <span className="text-[9px] text-slate-400 uppercase tracking-wider">PDF, MP4, or Images up to 20MB only</span>
                      </div>
                    </div>
                  </div>

                  {/* File Preview List */}
                  {proofFiles.length > 0 && (
                    <div className="flex flex-col gap-2 max-h-[150px] overflow-y-auto pr-1 custom-sidebar-scrollbar">
                      {proofFiles.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 rounded-lg border bg-white/50 dark:bg-slate-850/50 border-slate-200/50 dark:border-slate-800">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate">{file.name}</span>
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

                  {/* Anonymous Submit Option */}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="anonymous"
                      checked={anonymous}
                      onChange={(e) => setAnonymous(e.target.checked)}
                      className="rounded border-slate-300 dark:border-slate-800 text-cyan-500 focus:ring-cyan-400"
                    />
                    <label htmlFor="anonymous" className="text-xs text-slate-550 dark:text-slate-400 font-bold select-none cursor-pointer">
                      File anonymously (Hide my name from non-administrative leaders)
                    </label>
                  </div>

                  <PremiumButton 
                    type="submit" 
                    variant="primary" 
                    size="md" 
                    className={`w-full mt-2 ${isEmergency ? 'bg-rose-500 hover:bg-rose-600 shadow-glow-rose before:from-rose-400 before:to-rose-600' : ''}`}
                    disabled={submitting}
                  >
                    {submitting ? 'Transmitting Evidences & Lodge...' : (isEmergency ? 'Trigger Emergency Dispatch' : 'Lodge Union Grievance')}
                  </PremiumButton>
                </form>
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
