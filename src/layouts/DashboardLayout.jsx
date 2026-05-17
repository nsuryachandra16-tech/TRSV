import React, { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Shield, 
  ShieldAlert, 
  Users, 
  Radio, 
  LayoutDashboard, 
  UserCheck, 
  Bell, 
  LogOut, 
  ArrowLeft, 
  Menu, 
  X, 
  CheckCircle, 
  Info, 
  MapPin, 
  FileText 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/ThemeToggle';
import FloatingParticles from '../components/FloatingParticles';

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;
  const { userProfile, logout } = useAuth();

  // Dynamically resolve and track the active role state based on PostgreSQL auth context
  const getActiveRole = () => {
    if (!userProfile) return 'student';
    if (userProfile.role === 'supreme_admin') return 'command';
    if (['secretary', 'general_secretary', 'vice_president', 'president'].includes(userProfile.role)) return 'leader';
    return 'student';
  };

  const activeRole = getActiveRole();

  const overviewConfig = {
    student: { name: 'Grievance Portal', desc: 'My Safety & Grievance Board', icon: <Users className="w-5 h-5" /> },
    leader: { name: 'Leader Dashboard', desc: 'Regional Constituency Grievances', icon: <UserCheck className="w-5 h-5" /> },
    command: { name: 'State Command Console', desc: 'Supreme Governance Panel', icon: <Radio className="w-5 h-5" /> }
  };

  const currentOverview = overviewConfig[activeRole] || overviewConfig.student;

  const sidebarLinks = [
    {
      category: 'My Control Hub',
      links: [
        {
          name: currentOverview.name,
          path: `/dashboard/${activeRole}`,
          icon: currentOverview.icon,
          desc: currentOverview.desc
        }
      ]
    },
    {
      category: 'Support & Transparency',
      links: [
        {
          name: '24/7 Helpline & Dispatch',
          path: '/dashboard/support',
          icon: <ShieldAlert className="w-5 h-5" />,
          desc: 'Emergency Incident Dispatch'
        },
        {
          name: 'Regional Command Hubs',
          path: '/dashboard/districts',
          icon: <MapPin className="w-5 h-5" />,
          desc: 'Telangana Directory'
        },
        {
          name: 'Public Audit Ledger',
          path: '/dashboard/transparency',
          icon: <CheckCircle className="w-5 h-5" />,
          desc: 'Verified Resolution Registry'
        },
        {
          name: 'Organizational Hierarchy',
          path: '/dashboard/about',
          icon: <Info className="w-5 h-5" />,
          desc: 'Governance Framework & Tiers'
        },
        {
          name: 'Core Executive Board',
          path: '/dashboard/team',
          icon: <Users className="w-5 h-5" />,
          desc: 'Advisors & Hyderabad Leaders'
        },
        {
          name: 'Official Updates',
          path: '/dashboard/announcements',
          icon: <Bell className="w-5 h-5" />,
          desc: 'Statewide Circular Alerts'
        },
        // Only student roles can lodge standard complaints directly
        ...(userProfile?.role === 'student' ? [{
          name: 'Report an Issue',
          path: '/dashboard/contact',
          icon: <FileText className="w-5 h-5" />,
          desc: 'Submit Grievance Form'
        }] : [])
      ]
    }
  ];

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error.message);
    }
  };

  return (
    <div className="min-h-screen flex bg-tsrv-bg-light dark:bg-tsrv-bg-dark transition-colors duration-500 overflow-hidden relative font-sans select-none">
      
      {/* Background canvas particles */}
      <FloatingParticles />

      {/* Sidebar - Desktop Layout */}
      <aside className="hidden lg:flex flex-col w-80 border-r border-slate-200/50 dark:border-slate-900/60 glass-panel-light dark:glass-panel-dark z-25 shrink-0 relative h-screen">
        {/* Brand Shield Logo */}
        <div className="p-6 border-b border-slate-200/50 dark:border-slate-900/60 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-cyan-400 flex items-center justify-center shadow-glow-cyan text-white">
            <Shield className="w-5.5 h-5.5" />
          </div>
          <div className="text-left">
            <span className="font-black text-base tracking-tight text-slate-800 dark:text-white uppercase block">
              TSRV State OS
            </span>
            <span className="text-[10px] font-extrabold text-cyan-600 dark:text-cyan-400 tracking-widest uppercase block mt-0.5">
              STATE CONTROL TERM
            </span>
          </div>
        </div>

        {/* Sidebar Scrollable Nav List */}
        <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-6 custom-sidebar-scrollbar">
          {sidebarLinks.map((section, sIdx) => (
            <div key={sIdx} className="flex flex-col gap-2.5 text-left">
              <span className="px-3.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                {section.category}
              </span>
              <div className="flex flex-col gap-1.5">
                {section.links.map((link) => {
                  const isActive = pathname === link.path;
                  return (
                    <Link
                      key={link.path}
                      to={link.path}
                      className={`flex items-start gap-3.5 p-3 rounded-2xl transition-all duration-300 relative ${
                        isActive
                           ? 'text-sky-600 dark:text-cyan-400 bg-slate-100/30 dark:bg-slate-900/20 font-black shadow-sm'
                           : 'text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/50 dark:hover:bg-slate-900/30 font-bold'
                      }`}
                    >
                      <div className={`p-2 rounded-xl transition-all duration-300 ${
                        isActive 
                          ? 'bg-sky-100 dark:bg-cyan-950/60 text-sky-600 dark:text-cyan-400 shadow-glow-cyan border border-cyan-500/20' 
                          : 'bg-slate-200/80 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 border border-transparent'
                      }`}>
                        {link.icon}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-extrabold text-sm truncate">{link.name}</span>
                        <span className={`text-[10px] mt-0.5 truncate ${isActive ? 'text-sky-500/90 dark:text-cyan-400/90 font-bold' : 'text-slate-500 dark:text-slate-400 font-semibold'}`}>{link.desc}</span>
                      </div>
                      {isActive && (
                        <motion.span
                          layoutId="activeSideIndicator"
                          className="absolute right-0 top-3 bottom-3 w-[3px] bg-gradient-to-b from-sky-500 to-cyan-400 rounded-l-md"
                          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar bottom action control */}
        <div className="p-4 border-t border-slate-200/50 dark:border-slate-900/60 flex flex-col gap-2">
          <Link
            to="/"
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-black border border-slate-350 dark:border-slate-800 text-slate-850 dark:text-slate-100 hover:bg-slate-100/50 dark:hover:bg-slate-900/50 transition-all duration-300"
          >
            <ArrowLeft className="w-4 h-4 text-cyan-500" />
            Public Portal Website
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-black bg-rose-500/15 text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white transition-all duration-300"
          >
            <LogOut className="w-4 h-4 text-rose-500" />
            Disconnect Node
          </button>
        </div>
      </aside>

      {/* Floating Hamburger Sidebar Trigger for Mobile/Tablet */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black z-30 lg:hidden"
            />
            <motion.aside
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-80 bg-white/98 dark:bg-slate-950/98 backdrop-blur-xl border-r border-slate-200/60 dark:border-slate-900 z-45 lg:hidden flex flex-col p-4 max-h-screen overflow-hidden shadow-2xl"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-200/50 dark:border-slate-900/60">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500 flex items-center justify-center text-white shadow-glow-cyan">
                    <Shield className="w-5 h-5" />
                  </div>
                  <span className="font-extrabold text-sm text-slate-800 dark:text-white uppercase tracking-wider">TSRV OS</span>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-500 border"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 py-4 overflow-y-auto flex flex-col gap-5 custom-sidebar-scrollbar min-h-0">
                {sidebarLinks.map((section, sIdx) => (
                  <div key={sIdx} className="flex flex-col gap-2.5 text-left">
                    <span className="px-3.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      {section.category}
                    </span>
                    <div className="flex flex-col gap-1.5">
                      {section.links.map((link) => {
                        const isActive = pathname === link.path;
                        return (
                          <Link
                            key={link.path}
                            to={link.path}
                            onClick={() => setSidebarOpen(false)}
                            className={`flex items-start gap-3 p-2.5 rounded-xl transition-all duration-300 relative ${
                              isActive
                                ? 'text-sky-600 dark:text-cyan-400 bg-slate-100/40 dark:bg-slate-900/30 font-black shadow-sm'
                                : 'text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/50 dark:hover:bg-slate-900/30 font-bold'
                            }`}
                          >
                            <div className={`p-1.5 rounded-lg transition-all duration-300 ${
                              isActive 
                                ? 'bg-sky-100 dark:bg-cyan-950/60 text-sky-600 dark:text-cyan-400 border border-cyan-500/20 shadow-glow-cyan/20' 
                                : 'bg-slate-200/80 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 border border-transparent'
                            }`}>
                              {link.icon}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-extrabold text-xs truncate">{link.name}</span>
                              <span className={`text-[9.5px] mt-0.5 truncate ${isActive ? 'text-sky-500/90 dark:text-cyan-400/90 font-bold' : 'text-slate-500 dark:text-slate-400 font-semibold'}`}>{link.desc}</span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-200/50 dark:border-slate-900/60 flex flex-col gap-2 shrink-0">
                <Link
                  to="/"
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-black border border-slate-350 dark:border-slate-800 text-slate-850 dark:text-slate-100 hover:bg-slate-100/50 dark:hover:bg-slate-900/50 transition-all duration-200"
                >
                  <ArrowLeft className="w-4 h-4 text-cyan-500" />
                  Public Website
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-black bg-rose-500/15 text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white transition-all duration-200"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  Disconnect
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Panel Frame Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto relative z-10 h-screen">
        
        {/* Top bar dashboard control strips */}
        <header className="sticky top-0 z-20 w-full px-4 sm:px-6 py-4">
          <div className="glass-panel-light dark:glass-panel-dark glass-card-border-light dark:glass-card-border-dark px-4 sm:px-6 py-3.5 rounded-2xl flex items-center justify-between shadow-premium-light dark:shadow-premium-dark">
            
            {/* Sidebar mobile toggle trigger */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-500 border border-slate-200/50 dark:border-slate-880"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="flex flex-col text-left">
                <h1 className="text-sm sm:text-base font-extrabold text-slate-850 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  State Governance Terminal
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-green-500/10 text-green-500 border border-green-500/20 animate-pulse">
                    Live Node
                  </span>
                </h1>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 hidden sm:block mt-0.5">
                  Statewide Protection Telemetry Node
                </p>
              </div>
            </div>

            {/* Quick Action Widgets */}
            <div className="flex items-center gap-3">
              {/* Notification simulated indicator */}
              <div className="relative p-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/60 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors duration-200 cursor-pointer">
                <Bell className="w-4.5 h-4.5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full shadow-[0_0_5px_rgba(244,63,94,0.6)]" />
              </div>

              {/* Avatar widget details */}
              <div className="flex items-center gap-2 bg-slate-100/80 border border-slate-200/50 dark:bg-slate-900/60 dark:border-slate-800/60 px-3 py-1.5 rounded-xl">
                {userProfile?.profile_image ? (
                  <img 
                    src={userProfile.profile_image} 
                    alt={userProfile.full_name} 
                    className="w-6.5 h-6.5 rounded-lg object-cover shadow-glow-cyan shrink-0"
                  />
                ) : (
                  <div className="w-6.5 h-6.5 rounded-lg bg-gradient-to-tr from-sky-500 to-cyan-400 text-white font-black text-[10px] flex items-center justify-center uppercase shadow-glow-cyan shrink-0">
                    {userProfile?.full_name ? userProfile.full_name.split(' ').map(n => n[0]).join('').substring(0, 2) : 'ST'}
                  </div>
                )}
                <div className="hidden md:flex flex-col text-left">
                  <span className="text-[11px] font-extrabold text-slate-700 dark:text-white truncate max-w-[120px]">
                    {userProfile?.full_name || 'Advocate'}
                  </span>
                  <span className="text-[9px] text-slate-400 uppercase tracking-wider">
                    {userProfile?.role === 'supreme_admin' ? 'Supreme Leader' : userProfile?.role || 'Student'}
                  </span>
                </div>
              </div>

              <ThemeToggle />
            </div>

          </div>
        </header>

        {/* Dashboard Content Outlet with zero-overflow margins */}
        <main className="flex-1 p-4 sm:p-6 max-w-7xl mx-auto w-full relative z-10 overflow-y-auto">
          <Outlet />
        </main>

      </div>
    </div>
  );
}
