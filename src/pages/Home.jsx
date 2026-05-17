import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, ShieldAlert, Award, AlertOctagon, Eye, 
  MapPin, BookOpen, ArrowRight, MessageSquare, 
  Users, CheckCircle2, HeartHandshake, Shield 
} from 'lucide-react';

// Custom Premium Components
import ThreeEmblem from '../components/ThreeEmblem';
import GlassCard from '../components/GlassCard';
import PremiumButton from '../components/PremiumButton';
import AnimatedSection from '../components/AnimatedSection';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="w-full flex flex-col gap-28 py-4 relative overflow-hidden select-none">
      
      {/* 1. HERO SECTION */}
      <section className="relative min-h-[85vh] flex flex-col lg:flex-row items-center justify-between gap-16 pt-6 pb-12 w-full">
        
        {/* Left Side Content Block */}
        <AnimatedSection 
          direction="right" 
          className="flex-grow flex flex-col text-left gap-8 max-w-2xl"
        >
          {/* Animated badge glow indicator */}
          <div className="inline-flex items-center gap-2.5 self-start px-3.5 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[10px] font-black tracking-widest text-cyan-600 dark:text-cyan-400 uppercase">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
            Statewide Student Protection Protocol
          </div>

          <h1 className="fluid-heading-1 font-bold text-slate-800 dark:text-white leading-[1.1] tracking-normal">
            TSRV — The <span className="text-gradient-cyan">Governance & Protection</span> OS
          </h1>

          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 leading-relaxed max-w-lg">
            A state-of-the-art Statewide Student Protection & Issue Resolution Ecosystem. Delivering rapid anti-ragging response teams, automated complaint escalations, and public transparent audit ledgers.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-5 mt-2">
            <PremiumButton 
              variant="primary" 
              size="lg" 
              icon={<ShieldAlert className="w-5 h-5" />}
              onClick={() => navigate('/signup')}
            >
              Register a Complaint
            </PremiumButton>
            <PremiumButton 
              variant="secondary" 
              size="lg" 
              icon={<ArrowRight className="w-5 h-5" />}
              onClick={() => navigate('/login')}
            >
              Admin Login
            </PremiumButton>
          </div>

          {/* Quick core metrics summary */}
          <div className="grid grid-cols-2 gap-6 mt-4">
            <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-slate-50/40 dark:bg-slate-950/20 border border-slate-200/50 dark:border-slate-850">
              <div className="p-2 rounded-xl bg-green-500/10 text-green-500">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Active Protection</span>
                <span className="text-sm font-semibold text-slate-800 dark:text-white mt-0.5">24/7 Safety Squad</span>
              </div>
            </div>
            <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-slate-50/40 dark:bg-slate-950/20 border border-slate-200/50 dark:border-slate-850">
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-500">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Command Center</span>
                <span className="text-sm font-semibold text-slate-800 dark:text-white mt-0.5">State Protection Division</span>
              </div>
            </div>
          </div>

        </AnimatedSection>

        {/* Right Side 3D WebGL Emblem */}
        <AnimatedSection 
          direction="left" 
          className="flex-grow flex items-center justify-center relative w-full h-[350px] sm:h-[420px] lg:h-[480px]"
        >
          {/* Ambient Glowing Aura background overlay */}
          <div className="absolute w-72 h-72 bg-gradient-to-tr from-sky-400/10 to-cyan-400/10 dark:from-cyan-500/10 dark:to-blue-600/10 rounded-full blur-[90px] pointer-events-none" />
          <ThreeEmblem />
        </AnimatedSection>

      </section>

      {/* 2. CORE FEATURES & MANDATES */}
      <section id="features" className="w-full flex flex-col gap-12 text-left">
        <div className="max-w-3xl flex flex-col gap-4">
          <span className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 tracking-widest uppercase">
            Ecosystem Mandates
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-800 dark:text-white tracking-normal">
            Statewide Student Protection & Grievance Shield
          </h2>
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 leading-relaxed">
            TSRV employs secure technology, localized command nodes, and formal legal networks to safeguard students across campus clusters from extortion, ragging, and administrative malpractice.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
          {[
            {
              icon: <ShieldAlert className="w-6 h-6 text-rose-500" />,
              title: 'Student Safety Shield',
              desc: 'Rapid anti-ragging squad dispatches and statewide safety coordination units defending campus environments.',
              accent: 'border-l-rose-500'
            },
            {
              icon: <MessageSquare className="w-6 h-6 text-sky-500" />,
              title: 'Issue Redressal Registry',
              desc: 'Statewide issue reporting system routing incident tickets directly from student panels to verified leaders.',
              accent: 'border-l-sky-500'
            },
            {
              icon: <AlertOctagon className="w-6 h-6 text-orange-500" />,
              title: '24/7 Emergency Support',
              desc: 'Instant panic triggers for physical safety abuse, medical, or administrative crises directly on campus.',
              accent: 'border-l-orange-500'
            },
            {
              icon: <Eye className="w-6 h-6 text-cyan-500" />,
              title: 'Decentralized Audit Logs',
              desc: 'Public transparency dashboards tracking resolve times and verification certificates. Deletions are forbidden.',
              accent: 'border-l-cyan-500'
            },
            {
              icon: <MapPin className="w-6 h-6 text-indigo-500" />,
              title: 'Constituency Directories',
              desc: 'Dedicated portfolios and active coordination hotlines for localized constituency leaders.',
              accent: 'border-l-indigo-500'
            },
            {
              icon: <BookOpen className="w-6 h-6 text-teal-500" />,
              title: 'Rights Helpdesk',
              desc: 'State student rights directories, escalation procedures guidelines, and legal assistance contacts.',
              accent: 'border-l-teal-500'
            },
            {
              icon: <Award className="w-6 h-6 text-amber-500" />,
              title: 'Governance Academy',
              desc: 'Representative training, student advocacy guidelines, and organization leadership selection structures.',
              accent: 'border-l-amber-500'
            },
            {
              icon: <ShieldCheck className="w-6 h-6 text-green-500" />,
              title: 'Secure Credentials',
              desc: 'Secure digital identity credential tags for registered campus representatives to verify organization authority.',
              accent: 'border-l-green-500'
            }
          ].map((feat, i) => (
            <GlassCard key={i} hoverEffect={true} className={`p-6 flex flex-col gap-4 border-l-2 ${feat.accent} bg-white/40 dark:bg-slate-950/20`}>
              <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 flex items-center justify-center shadow-inner">
                {feat.icon}
              </div>
              <h3 className="font-semibold text-base text-slate-800 dark:text-white">
                {feat.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                {feat.desc}
              </p>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* 3. HOW IT WORKS (RESOLUTION WORKFLOW) */}
      <section className="w-full flex flex-col gap-12 text-left">
        <div className="max-w-3xl flex flex-col gap-4">
          <span className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 tracking-widest uppercase">
            Operational Pipeline
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-800 dark:text-white tracking-normal">
            Tactical Resolution Workflow
          </h2>
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 leading-relaxed">
            Our highly coordinated resolution process is designed to dispatch rapid student safety assistance with absolute verification trails.
          </p>
        </div>

        <AnimatedSection direction="up" className="relative w-full">
          {/* Timeline Center Connecting Line */}
          <div className="absolute left-8 lg:left-1/2 top-0 bottom-0 w-[2px] bg-slate-200 dark:bg-slate-850/60 -translate-x-1/2" />

          <div className="flex flex-col gap-12 relative">
            {[
              { step: '01', title: 'Incident Transmitted', desc: 'A student securely logs a ticket with verified constituency and college node metadata.' },
              { step: '02', title: 'On-Campus Fact Finding', desc: 'Vetted on-campus Secretaries initiate confidential fact validation within 2 hours.' },
              { step: '03', title: 'Constituency Escalation', desc: 'Validated files escalate directly to the Constituency General Secretary, alerting district advisors.' },
              { step: '04', title: 'Mediation & Dispatch', desc: 'Formal administrative mandates, legal notices, or rapid campus safety dispatches are executed.' },
              { step: '05', title: 'Public Logs Sealed', desc: 'Grievance resolution times and cryptographic audit hashes lock into public registry registers.' }
            ].map((item, idx) => {
              const isEven = idx % 2 === 0;
              return (
                <div key={idx} className={`flex flex-col lg:flex-row items-start justify-start w-full relative ${isEven ? 'lg:flex-row-reverse' : ''}`}>
                  
                  {/* Timeline Node Glow Bulb */}
                  <div className="absolute left-8 lg:left-1/2 w-6 h-6 rounded-full bg-cyan-500 border-4 border-white dark:border-slate-950 -translate-x-1/2 z-10 flex items-center justify-center shadow-glow-cyan" />

                  {/* Content grid */}
                  <div className="w-full lg:w-1/2 pl-16 lg:px-12 text-left">
                    <GlassCard hoverEffect={true} className="p-6 max-w-lg bg-white/40 dark:bg-slate-950/20">
                      <span className="text-2xl font-bold text-cyan-500 block mb-1">
                        {item.step}
                      </span>
                      <h4 className="font-semibold text-base text-slate-800 dark:text-white mb-2">
                        {item.title}
                      </h4>
                      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                        {item.desc}
                      </p>
                    </GlassCard>
                  </div>
                  <div className="hidden lg:block lg:w-1/2" />
                </div>
              );
            })}
          </div>
        </AnimatedSection>
      </section>

      {/* 4. EXECUTIVE LEADERSHIP BOARD (FOUNDER & STATE PRESIDENT) */}
      <section className="w-full flex flex-col gap-12 text-left">
        <div className="max-w-3xl flex flex-col gap-4">
          <span className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 tracking-widest uppercase">
            State Board Leadership
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-800 dark:text-white tracking-normal">
            Executive Leadership Board
          </h2>
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 leading-relaxed">
            Directing student security squads, coordinating legal advocacy panels, and monitoring regional command centers.
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 w-full max-w-7xl mx-auto mt-6 px-4 lg:px-8">
          
          {/* Card A: TSRV Founder */}
          <GlassCard hoverEffect={true} className="group p-6 flex flex-col items-stretch text-left bg-gradient-to-b from-white/40 to-white/10 dark:from-slate-950/50 dark:to-slate-950/20 border border-slate-200/50 dark:border-slate-850 shadow-2xl relative overflow-hidden rounded-3xl">
            
            {/* Cinematic Portrait Container */}
            <div className="w-full h-[440px] rounded-2xl overflow-hidden relative border border-slate-200/40 dark:border-slate-800 shadow-inner mb-6 bg-slate-100 dark:bg-slate-950">
              <img 
                src="/akka.jpg" 
                alt="Kavitha Kalvakuntla" 
                className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-85 pointer-events-none" />
              
              {/* Floating Glowing Badge */}
              <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md border border-cyan-500/30 shadow-lg">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-[9px] font-bold text-cyan-400 uppercase tracking-widest">FORMER & FOUNDER</span>
              </div>
            </div>

            {/* Profile Info Details */}
            <div className="flex flex-col flex-grow">
              <h3 className="text-2xl font-bold text-slate-800 dark:text-white tracking-normal mb-1 group-hover:text-cyan-500 transition-colors duration-300">
                Kavitha Kalvakuntla
              </h3>
              <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-widest block mb-4">
                Founder of TSRV & Former MP
              </span>
              
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-6 font-normal min-h-[60px]">
                Established TSRV with the core vision of statewide student protection, campus rights protection, and rapid youth empowerment across Telangana.
              </p>
              
              <div className="mt-auto pt-4 border-t border-slate-200/50 dark:border-slate-850/80 flex items-center gap-2 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-cyan-500">
                  <path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 002.273 1.765 11.842 11.842 0 00.976.644l.062.033.018.008.006.003zm3.81-11.433a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" clipRule="evenodd" />
                </svg>
                Office: Founder Secretariat, Hyderabad
              </div>
            </div>
          </GlassCard>

          {/* Card B: TSRV State President */}
          <GlassCard hoverEffect={true} className="group p-6 flex flex-col items-stretch text-left bg-gradient-to-b from-white/40 to-white/10 dark:from-slate-950/50 dark:to-slate-950/20 border border-slate-200/50 dark:border-slate-850 shadow-2xl relative overflow-hidden rounded-3xl">
            
            {/* Cinematic Portrait Container */}
            <div className="w-full h-[440px] rounded-2xl overflow-hidden relative border border-slate-200/40 dark:border-slate-800 shadow-inner mb-6 bg-slate-100 dark:bg-slate-950">
              <img 
                src="/ramuanna.jpg" 
                alt="Ramu Yadav" 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-85 pointer-events-none" />
              
              {/* Floating Glowing Badge */}
              <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md border border-rose-500/30 shadow-lg">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                <span className="text-[9px] font-bold text-rose-400 uppercase tracking-widest">STATE PRESIDENT</span>
              </div>
            </div>

            {/* Profile Info Details */}
            <div className="flex flex-col flex-grow">
              <h3 className="text-2xl font-bold text-slate-800 dark:text-white tracking-normal mb-1 group-hover:text-rose-500 transition-colors duration-300">
                Ramu Yadav
              </h3>
              <span className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-widest block mb-4">
                State President & Commander
              </span>
              
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-6 font-normal min-h-[60px]">
                Directs the on-campus safety squads, localized emergency dispatch coordination, campaign deployments, and student representative recruitment across all state constituency nodes.
              </p>
              
              <div className="mt-auto pt-4 border-t border-slate-200/50 dark:border-slate-850/80 flex items-center gap-2 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-rose-500">
                  <path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 002.273 1.765 11.842 11.842 0 00.976.644l.062.033.018.008.006.003zm3.81-11.433a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" clipRule="evenodd" />
                </svg>
                Office: State Command Division, Hyderabad Central
              </div>
            </div>
          </GlassCard>

        </div>
      </section>

      {/* 5. Direct CTA Action Frame */}
      <section className="w-full max-w-4xl mx-auto text-center py-4">
        <GlassCard className="p-8 sm:p-12 flex flex-col gap-6 items-center bg-cyan-500/5 dark:bg-slate-950/20 border border-cyan-500/20">
          <div className="p-3.5 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
            <HeartHandshake className="w-8 h-8" />
          </div>
          
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white tracking-normal">
            Secure Your Campus Cluster Node
          </h2>
          
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xl leading-relaxed">
            Join Telangana's high-tech student protection network. Recruit coordinators, register safety dispatches, and establish active representative defense shields.
          </p>

          <div className="flex gap-4 mt-2">
            <PremiumButton variant="primary" size="md" onClick={() => navigate('/signup')}>
              Get Started Now
            </PremiumButton>
            <PremiumButton variant="secondary" size="md" onClick={() => navigate('/login')}>
              Admin Panel
            </PremiumButton>
          </div>
        </GlassCard>
      </section>

    </div>
  );
}
