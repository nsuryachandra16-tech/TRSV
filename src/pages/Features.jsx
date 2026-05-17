import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, MessageSquare, AlertOctagon, Eye, MapPin, BookOpen, Award, Users, ChevronRight } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import PremiumButton from '../components/PremiumButton';
import AnimatedSection from '../components/AnimatedSection';

export default function Features() {
  const navigate = useNavigate();

  const services = [
    {
      icon: <ShieldCheck className="w-8 h-8 text-rose-500" />,
      title: 'Student Protection Network',
      details: 'Creating anti-abuse protocols and safety audits. Campus leads coordinate directly with law enforcement to prevent hazing, extortion, and systemic discrimination.',
      badge: 'High Priority'
    },
    {
      icon: <MessageSquare className="w-8 h-8 text-sky-500" />,
      title: 'Holographic Complaint Registry',
      details: 'A multi-tier ticketing system that accepts verified files and logs. Tickets auto-escalate from campus nodes to district boards within designated timeframe boundaries.',
      badge: 'Statewide'
    },
    {
      icon: <AlertOctagon className="w-8 h-8 text-orange-500" />,
      title: '24/7 Rapid Emergency Dispatch',
      details: 'Integrated mobile and desktop emergency panic nodes. Activates local support teams and contacts municipal emergency hotlines in real time.',
      badge: 'Active 24/7'
    },
    {
      icon: <Eye className="w-8 h-8 text-cyan-500" />,
      title: 'Public Transparency Board',
      details: 'Aggregated analytics displaying ticket resolution speed coefficients, pending items count, and overall trust index charts for public inspection.',
      badge: 'Public Audit'
    },
    {
      icon: <MapPin className="w-8 h-8 text-indigo-500" />,
      title: 'District Governance Console',
      details: 'Dedicated localized command consoles for all 33 districts. Connects local campus units directly with active division administrators.',
      badge: '33 Councils'
    },
    {
      icon: <BookOpen className="w-8 h-8 text-teal-500" />,
      title: 'Student Issue Support Hub',
      details: 'Step-by-step rights manuals, anti-ragging escalation protocols, legal counselor references, and 24/7 active safety squad dispatches.',
      badge: 'Emergency'
    },
    {
      icon: <Award className="w-8 h-8 text-amber-500" />,
      title: 'Leadership Incubator Tracks',
      details: 'Mentoring sessions, student advocacy workshops, organization conventions, and structured youth leadership recruitment programs.',
      badge: 'Incubator'
    },
    {
      icon: <Users className="w-8 h-8 text-green-500" />,
      title: 'Statewide Leadership Council',
      details: 'A verified, credential-backed network of digital student advocates acting as official state representatives in local regional boards.',
      badge: 'Credentialed'
    }
  ];

  return (
    <div className="w-full flex flex-col gap-16 py-4">
      
      {/* Header */}
      <AnimatedSection direction="up" className="text-center max-w-3xl mx-auto flex flex-col gap-4">
        <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400 tracking-widest uppercase">
          CORE CAPABILITIES
        </span>
        <h1 className="fluid-heading-2 font-black text-slate-850 dark:text-white leading-tight">
          Futuristic Statewide Student Governance OS
        </h1>
        <p className="text-base sm:text-lg text-slate-500 dark:text-slate-400 leading-relaxed">
          Phase 1 outlines the operational nodes of our 8 core governance systems designed to deliver student defense, protection, transparency, and training.
        </p>
      </AnimatedSection>

      {/* Grid of features */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch w-full">
        {services.map((item, idx) => (
          <GlassCard key={idx} hoverEffect={true} className="p-8 flex flex-col justify-between gap-6 text-left relative overflow-hidden">
            <div className="flex items-start justify-between gap-4">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 flex items-center justify-center">
                {item.icon}
              </div>
              <span className="px-3 py-1 rounded-full text-[10px] font-black tracking-wider bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 uppercase border border-cyan-500/20">
                {item.badge}
              </span>
            </div>

            <div className="flex flex-col gap-2">
              <h3 className="font-extrabold text-xl text-slate-850 dark:text-white tracking-tight">
                {item.title}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                {item.details}
              </p>
            </div>

            <div className="border-t border-slate-200/50 dark:border-slate-800/80 pt-4">
              <button
                onClick={() => navigate('/dashboard/student')}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 transition-colors"
              >
                Access System Module <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </GlassCard>
        ))}
      </section>

      {/* Bottom CTA Block */}
      <AnimatedSection direction="up" className="w-full max-w-4xl mx-auto">
        <GlassCard className="p-8 sm:p-12 text-center flex flex-col items-center gap-6 border">
          <h2 className="font-black text-2xl text-slate-850 dark:text-white">
            Access The Student Governance Network
          </h2>
          <p className="text-sm sm:text-base text-slate-550 dark:text-slate-400 leading-relaxed max-w-xl">
            Register your profile, file secure complaints, review resolved ticket metrics, or connect with active state district leads.
          </p>
          <div className="flex items-center gap-4">
            <PremiumButton 
              variant="primary" 
              size="md" 
              onClick={() => navigate('/signup')}
            >
              Sign Up As Student
            </PremiumButton>
            <PremiumButton 
              variant="secondary" 
              size="md" 
              onClick={() => navigate('/login')}
            >
              Staff Portal Access
            </PremiumButton>
          </div>
        </GlassCard>
      </AnimatedSection>

    </div>
  );
}
