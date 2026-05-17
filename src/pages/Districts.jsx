import React, { useState, useEffect } from 'react';
import { MapPin, Search, Users, ShieldAlert, CheckCircle2, Shield, Building2 } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import AnimatedSection from '../components/AnimatedSection';
import { useAuth } from '../context/AuthContext';

const formatRole = (role, tier) => {
  if (role === 'supreme_admin') return 'TRSV Founder';
  if (role === 'president') {
    if (tier === 'state') return 'State President';
    if (tier === 'hub') return 'Greater Hyderabad President';
    return 'Local President';
  }
  if (role === 'general_secretary') {
    if (tier === 'hub') return 'Greater Hyderabad General Secretary';
    return 'General Secretary';
  }
  if (role === 'vice_president') return 'Vice President';
  if (role === 'secretary') return 'Secretary';
  return role.replace(/_/g, ' ').toUpperCase();
};

const LeaderCard = ({ lead, tier, color = 'cyan', constName = '' }) => {
  const styles = {
    cyan: {
      wrap: 'bg-slate-50/60 dark:bg-slate-900/50 border border-slate-200/40 dark:border-slate-800 hover:border-cyan-500/30',
      bar: 'bg-cyan-500',
      img: 'ring-2 ring-cyan-500/30',
      name: 'text-slate-900 dark:text-white',
      role: 'text-cyan-600 dark:text-cyan-400',
      btn: 'bg-cyan-500/10 text-cyan-500 hover:bg-cyan-500 hover:text-white border border-cyan-500/20',
    },
    emerald: {
      wrap: 'bg-emerald-500/5 border border-emerald-500/20 hover:border-emerald-500/40',
      bar: 'bg-emerald-500',
      img: 'ring-2 ring-emerald-500/30',
      name: 'text-slate-900 dark:text-white',
      role: 'text-emerald-600 dark:text-emerald-400',
      btn: 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white border border-emerald-500/20',
    },
    violet: {
      wrap: 'bg-violet-500/5 border border-violet-500/20 hover:border-violet-500/40',
      bar: 'bg-violet-500',
      img: 'ring-2 ring-violet-500/30',
      name: 'text-slate-900 dark:text-white',
      role: 'text-violet-600 dark:text-violet-400',
      btn: 'bg-violet-500/10 text-violet-500 hover:bg-violet-500 hover:text-white border border-violet-500/20',
    },
  };
  const s = styles[color];

  return (
    <div className={`flex items-stretch gap-0 rounded-2xl overflow-hidden transition-all duration-200 animate-fadeIn ${s.wrap}`}>
      {/* Colored left accent bar */}
      <div className={`w-1 shrink-0 ${s.bar}`} />

      {/* Photo */}
      <div className="w-20 h-20 shrink-0 m-3">
        <img
          src={lead.profile_image || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256'}
          alt={lead.full_name}
          className={`w-full h-full rounded-xl object-cover object-top ${s.img}`}
        />
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col justify-center gap-0.5 py-3 pr-4 min-w-0">
        <span className={`font-black text-sm leading-tight truncate ${s.name}`}>
          {lead.full_name}
        </span>
        <span className={`text-[9.5px] font-black uppercase tracking-wider ${s.role}`}>
          {formatRole(lead.role, tier)}{constName ? ` — ${constName}` : ''}
        </span>
      </div>
    </div>
  );
};


const TierSection = ({ pulse, title, children, empty }) => (
  <div className="flex flex-col gap-4">
    <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-900 pb-2">
      <span className={`w-2 h-2 rounded-full animate-pulse ${pulse}`} />
      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">{title}</h3>
    </div>
    <div className="flex flex-col gap-3">
      {empty ? (
        <div className="flex flex-col items-center justify-center py-6 px-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/10 text-center gap-2 min-h-[100px]">
          <Users className="w-7 h-7 text-slate-400 stroke-[1.5]" />
          <span className="font-bold text-xs text-slate-500 block">No officers assigned yet</span>
          <span className="text-[9.5px] text-slate-400 block">Board assignments pending for this area.</span>
        </div>
      ) : children}
    </div>
  </div>
);

export default function Districts() {
  const { userProfile } = useAuth();
  const [search, setSearch] = useState('');
  const [constituencyList, setConstituencyList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [leadersData, setLeadersData] = useState({ statewideLeaders: [], mainHubLeaders: [], localLeaders: [] });
  const [selectedConstituency, setSelectedConstituency] = useState(null);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [dirRes, leadRes] = await Promise.all([
          fetch('/api/constituencies/directory'),
          fetch('/api/constituencies/leaders-grid')
        ]);
        const dirData = await dirRes.json();
        const leadData = await leadRes.json();

        if (dirData.success) {
          // Only show sub-constituencies (those with a parent) and parent hubs in directory
          setConstituencyList(dirData.directory);

          // Auto-select student's own constituency, otherwise first sub-constituency
          const studentCon = dirData.directory.find(c => c.id === userProfile?.constituency_id);
          if (studentCon) {
            setSelectedConstituency(studentCon);
          } else if (dirData.directory.length > 0) {
            const defaultCon = dirData.directory.find(c =>
              c.constituency_name.toLowerCase().includes('nampally')
            ) || dirData.directory[0];
            setSelectedConstituency(defaultCon);
          }
        }

        if (leadData.success) {
          setLeadersData({
            statewideLeaders: leadData.statewideLeaders || [],
            mainHubLeaders: leadData.mainHubLeaders || [],
            localLeaders: leadData.localLeaders || []
          });
        }
      } catch (err) {
        console.error('Failed to load districts data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [userProfile]);

  const filteredConstituencies = constituencyList.filter(c =>
    c.constituency_name.toLowerCase().includes(search.toLowerCase()) ||
    (c.coordinator_name || '').toLowerCase().includes(search.toLowerCase()) ||
    c.district.toLowerCase().includes(search.toLowerCase())
  );

  // Local sub-leaders for selected constituency
  const activeLocalLeaders = selectedConstituency
    ? leadersData.localLeaders.filter(l => l.constituency_id === selectedConstituency.id)
    : [];

  return (
    <div className="w-full flex flex-col gap-12 py-4 animate-fadeIn">

      {/* Header */}
      <AnimatedSection direction="up" className="text-center max-w-3xl mx-auto flex flex-col gap-4">
        <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400 tracking-widest uppercase">
          STATEWIDE COORDINATION
        </span>
        <h1 className="fluid-heading-2 font-black text-slate-850 dark:text-white leading-tight">
          Regional Command Hubs
        </h1>
        <p className="text-base sm:text-lg text-slate-500 dark:text-slate-400 leading-relaxed">
          TSRV operates a 3-tier governance structure: <strong className="text-cyan-500">State → Greater Hyderabad → Local Constituency</strong>. Select any constituency below to see its full command chain.
        </p>
      </AnimatedSection>

      {/* 3-Tier Command Board */}
      <AnimatedSection direction="up" delay={0.1}>
        <GlassCard className="p-6 md:p-8 border border-slate-200/50 dark:border-slate-900/60 flex flex-col gap-6 text-left">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-200/40 dark:border-slate-800/60 pb-6">
            <div>
              <span className="text-[10px] font-black text-cyan-600 dark:text-cyan-400 tracking-widest uppercase block mb-1">
                LIVE 3-TIER COMMAND BOARD
              </span>
              <h2 className="text-xl md:text-2xl font-black text-slate-850 dark:text-white flex items-center gap-2">
                <Shield className="w-6 h-6 text-cyan-500" />
                Constituency Governance Council
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Viewing command chain for <strong className="text-cyan-500">{selectedConstituency?.constituency_name || '...'}</strong>
              </p>
            </div>
            <div className="w-full md:w-64">
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                Select Constituency
              </label>
              <select
                value={selectedConstituency?.id || ''}
                onChange={e => {
                  const sel = constituencyList.find(c => c.id === parseInt(e.target.value));
                  if (sel) setSelectedConstituency(sel);
                }}
                className="w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-950/85 text-sm focus:outline-none focus:border-cyan-400 border-slate-200/60 dark:border-slate-800 text-slate-800 dark:text-slate-100 font-bold cursor-pointer"
              >
                {constituencyList.map(c => (
                  <option key={c.id} value={c.id}>{c.constituency_name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Tier 1: State */}
            <TierSection
              pulse="bg-cyan-500 shadow-glow-cyan"
              title="Tier 1 — State Command"
              empty={leadersData.statewideLeaders.length === 0}
            >
              {leadersData.statewideLeaders.map(lead => (
                <LeaderCard key={lead.id} lead={lead} tier="state" color="cyan" />
              ))}
            </TierSection>

            {/* Tier 2: Greater Hyderabad Hub */}
            <TierSection
              pulse="bg-emerald-500"
              title="Tier 2 — Greater Hyderabad Hub"
              empty={leadersData.mainHubLeaders.length === 0}
            >
              {leadersData.mainHubLeaders.map(lead => (
                <LeaderCard key={lead.id} lead={lead} tier="hub" color="emerald" constName={lead.constituency_name} />
              ))}
            </TierSection>

            {/* Tier 3: Local Sub-constituency */}
            <TierSection
              pulse="bg-violet-500"
              title={`Tier 3 — ${selectedConstituency?.constituency_name || 'Local'} Officers`}
              empty={activeLocalLeaders.length === 0}
            >
              {activeLocalLeaders.map(lead => (
                <LeaderCard key={lead.id} lead={lead} tier="local" color="violet" constName={selectedConstituency?.constituency_name} />
              ))}
            </TierSection>
          </div>
        </GlassCard>
      </AnimatedSection>

      {/* Constituency Directory Grid */}
      <section className="w-full flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="text-left">
            <h3 className="font-extrabold text-xl text-slate-850 dark:text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-cyan-500" />
              Hyderabad Constituency Directory
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {filteredConstituencies.length} active regional student commands
            </p>
          </div>
          <div className="relative w-full sm:w-72 shrink-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search constituency, district or leader..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border bg-white/40 dark:bg-slate-900/40 text-sm focus:outline-none focus:border-cyan-400 border-slate-200/60 dark:border-slate-800 text-slate-800 dark:text-slate-100"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-slate-400">
            Syncing constituency commands from Neon DB...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full text-left">
            {filteredConstituencies.length > 0 ? filteredConstituencies.map(dist => {
              const leadName = dist.coordinator_name || 'Vacant Coordinate';
              let leadRoleLabel = 'Board Assignment Pending';
              if (dist.coordinator_role) {
                if (dist.coordinator_role === 'supreme_admin') leadRoleLabel = 'TRSV Founder';
                else if (dist.coordinator_role === 'president') leadRoleLabel = 'President';
                else if (dist.coordinator_role === 'general_secretary') leadRoleLabel = 'General Secretary';
                else leadRoleLabel = dist.coordinator_role.replace(/_/g, ' ').toUpperCase();
                leadRoleLabel = `${leadRoleLabel} — ${dist.constituency_name}`;
              }
              const resolvedCount = dist.resolved_tickets || 0;
              const totalTickets = (dist.active_tickets || 0) + resolvedCount;
              const safetyRatio = totalTickets > 0 ? ((resolvedCount / totalTickets) * 100).toFixed(1) : '100.0';

              return (
                <GlassCard
                  key={dist.id}
                  hoverEffect={true}
                  className={`p-6 flex flex-col justify-between gap-6 border cursor-pointer transition-all duration-200
                    ${selectedConstituency?.id === dist.id
                      ? 'border-cyan-500/40 bg-cyan-500/5 dark:bg-cyan-500/5'
                      : 'border-slate-200/40 dark:border-slate-850'}`}
                  onClick={() => setSelectedConstituency(dist)}
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <MapPin className={`w-5 h-5 shrink-0 ${selectedConstituency?.id === dist.id ? 'text-cyan-400' : 'text-cyan-500'}`} />
                        <span className="font-extrabold text-base sm:text-lg text-slate-800 dark:text-white truncate">
                          {dist.constituency_name}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-cyan-500/10 text-cyan-500 border border-cyan-500/20 shrink-0">
                        {safetyRatio}% Secure
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 block -mt-2">
                      District: {dist.district}
                    </span>
                    <div className="h-[1px] bg-slate-250/50 dark:bg-slate-800/80 my-1" />
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div className="flex items-center gap-2 text-slate-500">
                        <Users className="w-4 h-4 text-slate-400" />
                        <span>Colleges: <strong className="text-slate-700 dark:text-white">{dist.college_count}</strong></span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-500">
                        <ShieldAlert className="w-4 h-4 text-rose-400" />
                        <span>Active: <strong className="text-slate-700 dark:text-white">{dist.active_tickets}</strong></span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed mt-2">
                      Chief Lead: <strong className="text-slate-700 dark:text-slate-350">{leadName}</strong>
                      <span className="block text-[10px] text-cyan-500 font-bold mt-0.5">{leadRoleLabel}</span>
                    </p>
                  </div>
                  <div className="flex items-center justify-end border-t border-slate-200/50 dark:border-slate-800/80 pt-4 text-xs">
                    <span className="text-[10px] font-extrabold text-green-500 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {resolvedCount} Resolved
                    </span>
                  </div>
                </GlassCard>
              );
            }) : (
              <div className="col-span-full py-12 text-center text-slate-450">
                No matching constituencies found.
              </div>
            )}
          </div>
        )}
      </section>

    </div>
  );
}
