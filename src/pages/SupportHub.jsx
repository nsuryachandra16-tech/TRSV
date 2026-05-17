import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, PhoneCall, HeartHandshake, HelpCircle, FileText, ChevronRight, Scale, AlertTriangle } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import PremiumButton from '../components/PremiumButton';
import AnimatedSection from '../components/AnimatedSection';

export default function SupportHub() {
  const navigate = useNavigate();
  const [counts, setCounts] = useState({ constituencies: 0, colleges: 0 });

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const res = await fetch('/api/complaints/public/stats');
        const data = await res.json();
        if (data.success) {
          setCounts({
            constituencies: data.stats.constituencyCount,
            colleges: data.stats.collegeCount
          });
        }
      } catch (err) {
        console.error('Failed to load dynamic hub directories:', err);
      }
    };
    fetchCounts();
  }, []);

  const rightsGuides = [
    { title: 'Anti-Ragging Protection Guideline', desc: 'Step-by-step reporting protocols and details of state safety squad dispatch codes.' },
    { title: 'Fee Malpractice Redressal', desc: 'How to document unauthorized charges and trigger constituency escalation routes.' },
    { title: 'Academic Harassment Mitigation', desc: 'Secure dispute filings and on-campus representative mediation guidelines.' }
  ];

  return (
    <div className="w-full flex flex-col gap-12 py-4 text-left">
      
      {/* Header Banner */}
      <AnimatedSection direction="up" className="text-center max-w-3xl mx-auto flex flex-col gap-4">
        <span className="text-xs font-bold text-rose-500 tracking-widest uppercase">
          EMERGENCY ASSISTANCE
        </span>
        <h1 className="fluid-heading-2 font-black text-slate-850 dark:text-white leading-tight text-center">
          Student Issue Support & Emergency Assistance Hub
        </h1>
        <p className="text-base sm:text-lg text-slate-500 dark:text-slate-400 leading-relaxed text-center">
          A centralized, technology-driven protection infrastructure. Access immediate 24/7 emergency helplines, student charter rights, and constituency grievance escalation systems.
        </p>
      </AnimatedSection>

      {/* Reworked Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch w-full">
        
        {/* 1. Emergency Contacts & Safety Lines */}
        <GlassCard hoverEffect={false} className="p-8 flex flex-col gap-6 border-l-2 border-rose-500">
          <div className="flex items-center gap-3 border-b border-slate-200/50 dark:border-slate-850 pb-4">
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500">
              <PhoneCall className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-extrabold text-xl text-slate-850 dark:text-white">Emergency Contacts Hub</h2>
              <p className="text-xs text-slate-450 mt-0.5">Instant statewide student protection and safety hotlines</p>
            </div>
          </div>

          <div className="flex flex-col gap-4 text-sm">
            <div className="p-4 rounded-xl bg-rose-500/5 dark:bg-rose-950/20 border border-rose-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <span className="font-black text-slate-800 dark:text-white block">Anti-Ragging Squad Hotline</span>
                <span className="text-xs text-slate-400">Direct active dispatcher and campus coordination node</span>
              </div>
              <a href="tel:18004258778" className="inline-flex items-center gap-1.5 font-bold text-rose-500 hover:underline shrink-0">
                1800-425-TSRV
              </a>
            </div>

            <div className="p-4 rounded-xl bg-slate-100/50 dark:bg-slate-900/40 border border-slate-200/40 dark:border-slate-850 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <span className="font-bold text-slate-850 dark:text-white block">Women Student Safety Unit</span>
                <span className="text-xs text-slate-400">Dedicated protection squad with legal advisors backing</span>
              </div>
              <a href="tel:1091" className="inline-flex items-center gap-1.5 font-bold text-cyan-500 hover:underline shrink-0">
                1091 (Statewide)
              </a>
            </div>

            <div className="p-4 rounded-xl bg-slate-100/50 dark:bg-slate-900/40 border border-slate-200/40 dark:border-slate-850 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <span className="font-bold text-slate-850 dark:text-white block">Constituency Emergency Dispatch</span>
                <span className="text-xs text-slate-400">Escalates ticket files directly to division representative leads</span>
              </div>
              <span className="font-mono text-slate-600 dark:text-slate-350">+91 80088 TSRV1</span>
            </div>
          </div>
        </GlassCard>

        {/* 2. Student Rights & Reporting Guidance */}
        <GlassCard hoverEffect={false} className="p-8 flex flex-col gap-6 border-l-2 border-cyan-500">
          <div className="flex items-center gap-3 border-b border-slate-200/50 dark:border-slate-850 pb-4">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-500">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-extrabold text-xl text-slate-850 dark:text-white">Student Rights Guidance</h2>
              <p className="text-xs text-slate-450 mt-0.5">Escalation procedures and rights defense protocols</p>
            </div>
          </div>

          <div className="flex flex-col gap-3.5">
            {rightsGuides.map((guide, idx) => (
              <div key={idx} className="p-3.5 rounded-xl bg-slate-100/50 dark:bg-slate-900/40 border border-slate-200/40 dark:border-slate-850 flex flex-col gap-1">
                <span className="font-extrabold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  {guide.title}
                </span>
                <p className="text-xs text-slate-450 leading-relaxed pl-3.5">
                  {guide.desc}
                </p>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* 3. Mental Wellness Reference Support */}
        <GlassCard hoverEffect={false} className="p-8 flex flex-col gap-6">
          <div className="flex items-center gap-3 border-b border-slate-200/50 dark:border-slate-850 pb-4">
            <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-500">
              <HeartHandshake className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-extrabold text-xl text-slate-850 dark:text-white">Wellness & Counselor Contacts</h2>
              <p className="text-xs text-slate-450 mt-0.5">Confidential mental support call lines for stress & distress</p>
            </div>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed mb-1">
            Facing severe ragging distress or anxiety? Connect with vetted student advisors and legal support professionals. Fully confidential, anonymous assistance.
          </p>

          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center p-3 rounded-xl bg-slate-100/50 dark:bg-slate-900/40 border border-slate-200/30 dark:border-slate-850 text-xs">
              <span className="font-bold text-slate-800 dark:text-white">Confidential Advisory Call</span>
              <a href="tel:18004258778" className="font-extrabold text-sky-500">1800-425-TSRV</a>
            </div>
            <div className="flex justify-between items-center p-3 rounded-xl bg-slate-100/50 dark:bg-slate-900/40 border border-slate-200/30 dark:border-slate-850 text-xs">
              <span className="font-bold text-slate-800 dark:text-white">State Peer Counseling Cell</span>
              <span className="font-mono text-slate-500">Scheduled via Student Panel</span>
            </div>
          </div>
        </GlassCard>

        {/* 4. Organization Helpdesk & Legal Escalation */}
        <GlassCard hoverEffect={false} className="p-8 flex flex-col gap-6">
          <div className="flex items-center gap-3 border-b border-slate-200/50 dark:border-slate-850 pb-4">
            <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-500">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-extrabold text-xl text-slate-850 dark:text-white">Governance Helpdesk</h2>
              <p className="text-xs text-slate-455 mt-0.5">Complaint assistance and legal counsel contacts</p>
            </div>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed mb-1">
            Student advocates stand ready to represent you. File tickets and coordinate directly with constituency Secretary representatives on campus clusters.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-100/50 dark:bg-slate-900/40 border border-slate-200/30 dark:border-slate-850 text-center flex flex-col justify-center gap-1">
              <span className="text-lg font-black text-cyan-500">{counts.constituencies}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Constituency Hubs</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-100/50 dark:bg-slate-900/40 border border-slate-200/30 dark:border-slate-850 text-center flex flex-col justify-center gap-1">
              <span className="text-lg font-black text-sky-500">{counts.colleges}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">College Nodes</span>
            </div>
          </div>
        </GlassCard>

      </div>

      {/* Warning safety banner */}
      <AnimatedSection direction="up" className="w-full max-w-4xl mx-auto">
        <GlassCard className="p-6 flex flex-col sm:flex-row items-center justify-between gap-6 border border-rose-500/20 bg-rose-500/5">
          <div className="flex items-center gap-4 text-left">
            <div className="p-3.5 rounded-2xl bg-rose-500/10 text-rose-500 shrink-0">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-extrabold text-slate-850 dark:text-white">Instant Physical Threat Protection</span>
              <p className="text-xs text-slate-500 leading-relaxed">
                If you are facing immediate physical harm or ragging, do not delay! Lodge a live case via the **Student Dashboard** or trigger the direct Anti-Ragging squad helpline at **1800-425-TSRV** immediately.
              </p>
            </div>
          </div>
          <PremiumButton variant="primary" size="md" className="shrink-0" onClick={() => navigate('/signup')}>
            Lodge Live Case
          </PremiumButton>
        </GlassCard>
      </AnimatedSection>

    </div>
  );
}
