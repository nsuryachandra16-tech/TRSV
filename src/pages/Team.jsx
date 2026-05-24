import React, { useState, useEffect } from 'react';
import { ShieldCheck, Award, Users, Building2, MapPin } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import AnimatedSection from '../components/AnimatedSection';

const formatRole = (role, tier) => {
  if (role === 'supreme_admin') return 'TRSV Founder';
  if ((role === 'president' || role === 'state_president') && tier === 'state') return 'State President';
  if ((role === 'president' || role === 'state_president') && tier === 'hub') return 'Greater Hyderabad President';
  if (role === 'president' || role === 'state_president') return 'Local President';
  if (role === 'general_secretary' && tier === 'hub') return 'Greater Hyderabad General Secretary';
  if (role === 'general_secretary') return 'General Secretary';
  if (role === 'digital_operations_president') return 'Greater Hyderabad Digital Operations President';
  if (role === 'dev') return 'Developer & Greater Hyderabad Digital Operations President';
  if (role === 'vice_president') return 'Vice President';
  if (role === 'secretary') return 'Secretary';
  return role.replace(/_/g, ' ').toUpperCase();
};

const getRoleDesc = (role, tier) => {
  if (role === 'supreme_admin') return 'Founding director of TSRV — established the statewide student rights movement, legal advocacy networks, and the digital governance infrastructure protecting students across Telangana.';
  if ((role === 'president' || role === 'state_president') && tier === 'state') return 'Commands all constituency hub operations, campus safety cell deployments, emergency dispatches, and district-level governance protocols across the state.';
  if ((role === 'president' || role === 'state_president') && tier === 'hub') return 'Directs the Greater Hyderabad regional assembly operations, on-ground safety squads, issue escalation chains, and district executive coordination networks.';
  if (role === 'general_secretary' && tier === 'hub') return 'Manages compliance documentation, college cluster governance nodes, complaint escalation records, and administrative coordination across Greater Hyderabad.';
  if (role === 'president' || role === 'state_president') return 'Leads local constituency operations, campus safety coordination, and complaint redressal processes for assigned student communities.';
  if (role === 'general_secretary') return 'Handles constituency documentation, issue tracking, representative coordination, and administrative escalation workflows.';
  if (role === 'digital_operations_president') return 'Commands Greater Hyderabad digital operations, managing real-time security telemetry, constituency hub networks, and the online safety portal.';
  if (role === 'dev') return 'Digital Architect of TSRV — designs, implements, and maintains the high-fidelity secure operating portal, database clusters, and student emergency telemetry networks, and commands Greater Hyderabad digital operations.';
  return 'Board coordinator providing governance support, legal aid, and dispute resolution tracking in the assigned region.';
};

// Big cinematic portrait card (like Home.jsx)
const CinematicCard = ({ lead, tier, accentColor = 'cyan' }) => {
  const accents = {
    cyan: {
      gradient: 'from-cyan-500/20 to-transparent',
      badge: 'border-cyan-500/40 text-cyan-400',
      pulseDot: 'bg-cyan-400',
      roleColor: 'text-cyan-400',
      hoverColor: 'group-hover:text-cyan-400',
      officeIcon: 'text-cyan-500',
      dept: 'text-cyan-500/80',
    },
    emerald: {
      gradient: 'from-emerald-500/20 to-transparent',
      badge: 'border-emerald-500/40 text-emerald-400',
      pulseDot: 'bg-emerald-400',
      roleColor: 'text-emerald-400',
      hoverColor: 'group-hover:text-emerald-400',
      officeIcon: 'text-emerald-500',
      dept: 'text-emerald-500/80',
    },
    violet: {
      gradient: 'from-violet-500/20 to-transparent',
      badge: 'border-violet-500/40 text-violet-400',
      pulseDot: 'bg-violet-400',
      roleColor: 'text-violet-400',
      hoverColor: 'group-hover:text-violet-400',
      officeIcon: 'text-violet-500',
      dept: 'text-violet-500/80',
    },
  };
  const c = accents[accentColor];

  return (
    <GlassCard hoverEffect={true} className="group p-0 flex flex-col items-stretch text-left bg-gradient-to-b from-white/40 to-white/10 dark:from-slate-950/50 dark:to-slate-950/20 border border-slate-200/50 dark:border-slate-800 shadow-xl overflow-hidden rounded-3xl">

      {/* Cinematic Portrait */}
      <div className="w-full h-[320px] sm:h-[380px] relative overflow-hidden bg-slate-100 dark:bg-slate-950">
        {lead.profile_image ? (
          <img
            src={lead.profile_image}
            alt={lead.full_name}
            loading="lazy"
            className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950/40 flex flex-col items-center justify-center p-6 text-center select-none border-b border-slate-900/50">
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-3 shadow-[0_0_20px_rgba(6,182,212,0.1)]">
              <Users className="w-7 h-7 text-cyan-400" />
            </div>
            <span className="text-[10px] font-black text-cyan-400 tracking-[0.25em] uppercase mb-1">
              TRSV Officer
            </span>
            <span className="text-xs font-bold text-slate-500 tracking-wider">
              Revealing Soon
            </span>
          </div>
        )}
        {/* Bottom gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent opacity-90 pointer-events-none" />

        {/* Floating role badge top-left */}
        <div className={`absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/85 backdrop-blur-md border ${c.badge} shadow-lg`}>
          <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${c.pulseDot}`} />
          <span className={`text-[9px] font-black uppercase tracking-widest ${c.roleColor}`}>
            {formatRole(lead.role, tier)}
          </span>
        </div>

        {/* Name overlaid at the bottom of portrait */}
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-5">
          <h3 className={`text-xl sm:text-2xl font-black text-white leading-tight mb-1 transition-colors duration-300 ${c.hoverColor}`}>
            {lead.full_name}
          </h3>
          {lead.constituency_name && (
            <span className={`text-[10px] font-bold uppercase tracking-wider ${c.dept} flex items-center gap-1`}>
              <MapPin className="w-3 h-3" />
              {lead.constituency_name}
            </span>
          )}
        </div>
      </div>

      {/* Details below portrait */}
      <div className="flex flex-col gap-3 p-6">
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          {getRoleDesc(lead.role, tier)}
        </p>
      </div>
    </GlassCard>
  );
};

const SectionHeader = ({ icon, title, subtitle, color = 'cyan' }) => {
  const cols = {
    cyan: 'text-cyan-500',
    emerald: 'text-emerald-500',
    violet: 'text-violet-500',
  };
  return (
    <div className="flex flex-col gap-1 border-b border-slate-200/50 dark:border-slate-800 pb-4 mb-2">
      <div className={`flex items-center gap-2 ${cols[color]}`}>
        {icon}
        <span className="text-xs font-black uppercase tracking-widest text-slate-400">
          {title}
        </span>
      </div>
      {subtitle && <p className="text-xs text-slate-400 mt-0.5 ml-6">{subtitle}</p>}
    </div>
  );
};

export default function Team() {
  const [leadersData, setLeadersData] = useState({ statewideLeaders: [], mainHubLeaders: [], localLeaders: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaders = async () => {
      try {
        const res = await fetch('/api/constituencies/leaders-grid');
        const data = await res.json();
        if (data.success) {
          setLeadersData({
            statewideLeaders: data.statewideLeaders || [],
            mainHubLeaders: data.mainHubLeaders || [],
            localLeaders: data.localLeaders || [],
          });
        }
      } catch (err) {
        console.error('Failed to fetch team:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaders();
  }, []);

  return (
    <div className="w-full flex flex-col gap-16 py-4">

      {/* Header */}
      <AnimatedSection direction="up" className="text-center max-w-3xl mx-auto flex flex-col gap-4">
        <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400 tracking-widest uppercase">
          TSRV DIRECTORY
        </span>
        <h1 className="fluid-heading-2 font-black text-slate-850 dark:text-white leading-tight">
          Executive Board & Command Council
        </h1>
        <p className="text-base sm:text-lg text-slate-500 dark:text-slate-400 leading-relaxed">
          The 3-tier governance leadership of TSRV — from Statewide Command down to Greater Hyderabad and local constituency officers.
        </p>
      </AnimatedSection>

      {loading ? (
        <div className="py-20 text-center text-sm text-slate-400 animate-pulse">
          Syncing leadership council from database...
        </div>
      ) : (
        <div className="flex flex-col gap-16 text-left animate-fadeIn">

          {/* Tier 1: Statewide */}
          {leadersData.statewideLeaders.length > 0 && (
            <AnimatedSection direction="up" delay={0.05} className="flex flex-col gap-6">
              <SectionHeader
                icon={<Award className="w-4 h-4" />}
                title="Tier 1 — Statewide Command"
                subtitle="Overall state governance and supreme authority"
                color="cyan"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {leadersData.statewideLeaders.map(lead => (
                  <CinematicCard
                    key={lead.id}
                    lead={lead}
                    tier="state"
                    accentColor="cyan"
                  />
                ))}
              </div>
            </AnimatedSection>
          )}

          {/* Tier 2: Greater Hyderabad Hub */}
          {leadersData.mainHubLeaders.length > 0 && (
            <AnimatedSection direction="up" delay={0.1} className="flex flex-col gap-6">
              <SectionHeader
                icon={<Building2 className="w-4 h-4" />}
                title="Tier 2 — Greater Hyderabad Command"
                subtitle="Regional hub overseeing all Hyderabad area constituencies"
                color="emerald"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {leadersData.mainHubLeaders.map(lead => (
                  <CinematicCard
                    key={lead.id}
                    lead={lead}
                    tier="hub"
                    accentColor="emerald"
                  />
                ))}
              </div>
            </AnimatedSection>
          )}

          {/* Tier 3: Local sub-officers */}
          {leadersData.localLeaders.length > 0 && (
            <AnimatedSection direction="up" delay={0.15} className="flex flex-col gap-6">
              <SectionHeader
                icon={<Users className="w-4 h-4" />}
                title="Tier 3 — Local Constituency Officers"
                subtitle="Assigned local representatives for specific assembly areas"
                color="violet"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {leadersData.localLeaders.map(lead => (
                  <CinematicCard
                    key={lead.id}
                    lead={lead}
                    tier="local"
                    accentColor="violet"
                  />
                ))}
              </div>
            </AnimatedSection>
          )}

        </div>
      )}
    </div>
  );
}
