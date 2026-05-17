import React from 'react';
import { Volume2, Bell, AlertOctagon, Calendar, ArrowRight, BookOpen } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import AnimatedSection from '../components/AnimatedSection';

export default function Announcements() {
  const notices = [
    {
      date: 'May 16, 2026',
      tag: 'CAMPUS SHIELD',
      icon: <AlertOctagon className="w-5 h-5 text-rose-500" />,
      title: 'Anti-Ragging Squad Deployments to Engineering Clusters',
      desc: 'TSRV State Command has authorized rapid response squads to establish verified campus nodes at all Tier-2 engineering colleges for incoming academic batches. Squad members will perform daily checks at hostels and college cafeterias.'
    },
    {
      date: 'May 12, 2026',
      tag: 'SCHOLARSHIP HUB',
      icon: <BookOpen className="w-5 h-5 text-cyan-500" />,
      title: 'Telangana Merit Scholarship Directory Presets Updated',
      desc: 'The Scholarship finder has successfully integrated 42 new private trust scholarships catering to students in social sciences, pharmacy, and professional polytechnic courses. Complete matches directly at the Support portal.'
    },
    {
      date: 'May 05, 2026',
      tag: 'LEADERSHIP INITIATIVE',
      icon: <Bell className="w-5 h-5 text-amber-500" />,
      title: 'Statewide Student Coordinator Recruitment 2026 Begins',
      desc: 'Applications are officially open for verified student advocates looking to serve as campus representatives under district boards. Get credentials training, legal safeguard certificates, and local grievance authority.'
    }
  ];

  return (
    <div className="w-full flex flex-col gap-12 py-4 text-left">
      
      {/* Header Banner */}
      <AnimatedSection direction="up" className="text-center max-w-3xl mx-auto flex flex-col gap-4">
        <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400 tracking-widest uppercase">
          OFFICIAL CIRCULARS
        </span>
        <h1 className="fluid-heading-2 font-black text-slate-850 dark:text-white leading-tight">
          Statewide Campaign Notices
        </h1>
        <p className="text-base sm:text-lg text-slate-500 dark:text-slate-400 leading-relaxed text-center">
          Review authentic circulars, Anti-Ragging campaign bulletins, scholarship aggregates updates, and administrative recruitment notifications issued by State Command.
        </p>
      </AnimatedSection>

      {/* Announcements Feed Grid */}
      <section className="flex flex-col gap-6 w-full">
        {notices.map((note, idx) => (
          <GlassCard key={idx} hoverEffect={true} className="p-6 sm:p-8 flex flex-col sm:flex-row items-start gap-6 border-l-2 border-cyan-500">
            <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200/40 dark:border-slate-800 flex items-center justify-center shrink-0">
              {note.icon}
            </div>

            <div className="flex-1 flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs font-extrabold uppercase tracking-wider">
                <span className="text-cyan-500">{note.tag}</span>
                <span className="text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {note.date}
                </span>
              </div>

              <h2 className="font-extrabold text-xl text-slate-850 dark:text-white leading-snug">
                {note.title}
              </h2>
              
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                {note.desc}
              </p>
            </div>
          </GlassCard>
        ))}
      </section>

    </div>
  );
}
