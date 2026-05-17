import React from 'react';
import { ShieldCheck, Flag, Users, Scale, CheckCircle } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import AnimatedSection from '../components/AnimatedSection';

export default function About() {
  const pillars = [
    {
      icon: <ShieldCheck className="w-8 h-8 text-rose-500" />,
      title: 'Student Protection First',
      desc: 'Our primary mandate is creating a secure and intimidation-free learning environment across all educational zones. Our anti-ragging squad operates round the clock with legal counsel backing.'
    },
    {
      icon: <Scale className="w-8 h-8 text-cyan-500" />,
      title: 'Decentralized Transparency',
      desc: 'We publish resolution logs and responsive metrics publicly. Every ticket filed receives an immutable digital token that prevents college administrations from burying complaints.'
    },
    {
      icon: <Users className="w-8 h-8 text-sky-500" />,
      title: 'Regional Empowered Governance',
      desc: 'We support 33 active Constituency Hubs and a massive constituency-level campus cluster network. Constituency leads are empowered to audit local college clusters, campus security squads, and fee billing registries.'
    },
    {
      icon: <Flag className="w-8 h-8 text-amber-500" />,
      title: 'Statewide Representative Action',
      desc: 'TSRV operates a scalable State → Constituency → College network. We empower students to stand as coordinators, resolve local college issues, and direct rapid mediation dispatches.'
    }
  ];

  return (
    <div className="w-full flex flex-col gap-16 py-4">
      
      {/* Header Banner */}
      <AnimatedSection direction="up" className="text-center max-w-3xl mx-auto flex flex-col gap-4">
        <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400 tracking-widest uppercase">
          WHO WE ARE
        </span>
        <h1 className="fluid-heading-2 font-black text-slate-850 dark:text-white leading-tight">
          Telangana Rakshana Sena Vidyarthi Vibhagam
        </h1>
        <p className="text-base sm:text-lg text-slate-500 dark:text-slate-400 leading-relaxed">
          Founded as a statewide digital-first student governance organization, TSRV shields millions of students across campuses from exploitation, ragging, and institutional harassment.
        </p>
      </AnimatedSection>

      {/* Grid Pillars */}
      <section className="w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
        {pillars.map((item, idx) => (
          <GlassCard key={idx} hoverEffect={true} className="p-8 flex flex-col gap-4 text-left">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 flex items-center justify-center shadow-md">
              {item.icon}
            </div>
            <h3 className="font-extrabold text-xl text-slate-850 dark:text-white tracking-tight">
              {item.title}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              {item.desc}
            </p>
          </GlassCard>
        ))}
      </section>

      {/* State Student Charter Section */}
      <AnimatedSection direction="up" className="w-full max-w-4xl mx-auto">
        <GlassCard className="p-8 sm:p-12 text-left relative">
          <h2 className="font-extrabold text-2xl text-slate-850 dark:text-white mb-6 border-b border-slate-200/50 dark:border-slate-850 pb-4 flex items-center gap-2.5">
            <ShieldCheck className="w-6.5 h-6.5 text-cyan-500" />
            TSRV State Student Charter Principles
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-cyan-500 shrink-0 mt-0.5" />
              <span>Right to ragging-free secure housing and classrooms on every campus.</span>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-cyan-500 shrink-0 mt-0.5" />
              <span>Right to public fee clarity and full protection against administrative blackmail.</span>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-cyan-500 shrink-0 mt-0.5" />
              <span>Immediate access to legal counsel when facing wrongful academic suspensions.</span>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-cyan-500 shrink-0 mt-0.5" />
              <span>Right to participate in state-level leadership training networks.</span>
            </div>
          </div>
        </GlassCard>
      </AnimatedSection>

    </div>
  );
}
