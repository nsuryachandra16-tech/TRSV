import React, { useState, useEffect, useRef } from 'react';
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
  FileText,
  CreditCard,
  QrCode,
  MessageSquare
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

  const [notifications, setNotifications] = useState([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const activeLinkRef = useRef(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  const formatTimeAgo = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('tsrv_session_token');
      if (!token) return;
      const res = await fetch('/api/notifications', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 20000);
    return () => clearInterval(interval);
  }, []);

  // Scroll active sidebar link into view on load and navigation changes
  useEffect(() => {
    if (activeLinkRef.current) {
      activeLinkRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [pathname]);

  const handleMarkAllRead = async () => {
    try {
      const token = localStorage.getItem('tsrv_session_token');
      await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleRead = async (id, currentRead) => {
    if (currentRead) return;
    try {
      const token = localStorage.getItem('tsrv_session_token');
      await fetch(`/api/notifications/mark-read/${id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  // Dynamically resolve and track the active role state based on PostgreSQL auth context
  const getActiveRole = () => {
    if (!userProfile) return 'student';
    if (userProfile.role === 'supreme_admin' || userProfile.role === 'dev') return 'command';
    if (['secretary', 'general_secretary', 'vice_president', 'president'].includes(userProfile.role)) return 'leader';
    return 'student';
  };

  const activeRole = getActiveRole();

  const overviewConfig = {
    student: { name: 'Dashboard', desc: 'Main Student Panel', icon: <LayoutDashboard className="w-5 h-5" /> },
    leader: { name: 'Dashboard', desc: 'Leader Control Panel', icon: <LayoutDashboard className="w-5 h-5" /> },
    command: { name: 'Dashboard', desc: 'Admin Control Panel', icon: <LayoutDashboard className="w-5 h-5" /> }
  };

  const currentOverview = overviewConfig[activeRole] || overviewConfig.student;

  const sidebarLinks = [
    {
      category: 'General',
      links: [
        {
          name: currentOverview.name,
          path: `/dashboard/${activeRole}`,
          icon: currentOverview.icon,
          desc: 'Main user dashboard overview'
        },
        // Only student roles can lodge standard complaints directly
        ...(userProfile?.role === 'student' ? [{
          name: 'Complaint Register',
          path: '/dashboard/contact',
          icon: <FileText className="w-5 h-5" />,
          desc: 'Register a new complaint'
        }] : []),
        ...(userProfile?.role !== 'student' ? [{
          name: 'Messenger',
          path: '/dashboard/messenger',
          icon: <MessageSquare className="w-5 h-5" />,
          desc: 'Internal team chat rooms'
        }] : [])
      ]
    },
    {
      category: 'ID Verification',
      links: [
        {
          name: 'Digital ID',
          path: '/dashboard/digital-id',
          icon: <CreditCard className="w-5 h-5" />,
          desc: 'My digital identity card'
        },
        {
          name: 'QR Scanner',
          path: '/dashboard/qr-scanner',
          icon: <QrCode className="w-5 h-5" />,
          desc: 'Verify student ID cards'
        }
      ]
    },
    {
      category: 'Services',
      links: [
        {
          name: 'Support & Help',
          path: '/dashboard/support',
          icon: <ShieldAlert className="w-5 h-5" />,
          desc: 'Get assistance and help'
        },
        {
          name: 'Campus & Districts',
          path: '/dashboard/districts',
          icon: <MapPin className="w-5 h-5" />,
          desc: 'List of colleges and districts'
        },
        {
          name: 'Public Ledger',
          path: '/dashboard/transparency',
          icon: <CheckCircle className="w-5 h-5" />,
          desc: 'Verifiable complaint list'
        },
        {
          name: 'About TSRV',
          path: '/dashboard/about',
          icon: <Info className="w-5 h-5" />,
          desc: 'About TSRV union'
        },
        {
          name: 'TSRV Team',
          path: '/dashboard/team',
          icon: <Users className="w-5 h-5" />,
          desc: 'Union state leaders'
        },
        {
          name: 'Announcements',
          path: '/dashboard/announcements',
          icon: <Bell className="w-5 h-5" />,
          desc: 'Latest union announcements'
        }
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

      {/* Premium Ambient Glow Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] rounded-full bg-gradient-to-tr from-cyan-500/8 to-blue-500/5 dark:from-cyan-500/4 dark:to-blue-600/2 blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] rounded-full bg-gradient-to-br from-purple-500/8 to-cyan-500/5 dark:from-purple-500/3 dark:to-cyan-600/2 blur-[120px] pointer-events-none z-0" />

      {/* Sidebar - Desktop Layout */}
      <aside className="hidden lg:flex flex-col w-80 border-r border-slate-200/50 dark:border-slate-900/60 glass-panel-light dark:glass-panel-dark z-25 shrink-0 relative h-screen">
        {/* Brand Logo and Title */}
        <div className="p-6 border-b border-slate-200/50 dark:border-slate-900/60 flex items-center gap-3">
          <img 
            src="/trsv.jpeg" 
            alt="TSRV Logo" 
            className="w-10 h-10 rounded-2xl object-cover border border-cyan-500/30 shadow-[0_0_8px_rgba(6,182,212,0.15)] shrink-0"
          />
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
              <span className="px-3.5 text-[9.5px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider">
                {section.category}
              </span>
              <div className="flex flex-col gap-1.5">
                {section.links.map((link) => {
                  const isActive = pathname === link.path;
                  return (
                    <Link
                      key={link.path}
                      ref={isActive ? activeLinkRef : null}
                      to={link.path}
                      className={`flex items-start gap-3.5 p-3 rounded-2xl transition-all duration-300 relative ${
                        isActive
                           ? 'text-sky-600 dark:text-cyan-400 bg-slate-100/30 dark:bg-slate-900/20 font-semibold shadow-sm'
                           : 'text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/50 dark:hover:bg-slate-900/30 font-medium'
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
                        <span className="font-bold text-sm truncate">{link.name}</span>
                        <span className={`text-[10px] mt-0.5 truncate ${isActive ? 'text-sky-500/90 dark:text-cyan-400/90 font-medium' : 'text-slate-500 dark:text-slate-400 font-normal'}`}>{link.desc}</span>
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
              className="fixed inset-y-0 left-0 w-80 bg-white dark:bg-slate-950 border-r border-slate-200/60 dark:border-slate-900 z-45 lg:hidden flex flex-col p-4 max-h-screen overflow-hidden shadow-2xl"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-200/50 dark:border-slate-900/60">
                <div className="flex items-center gap-3">
                  <img 
                    src="/trsv.jpeg" 
                    alt="TSRV Logo" 
                    className="w-9 h-9 rounded-xl object-cover border border-cyan-500/30 shadow-[0_0_8px_rgba(6,182,212,0.15)] shrink-0"
                  />
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
                    <span className="px-3.5 text-[9.5px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider">
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
                                ? 'text-sky-600 dark:text-cyan-400 bg-slate-100/40 dark:bg-slate-900/30 font-semibold shadow-sm'
                                : 'text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/50 dark:hover:bg-slate-900/30 font-medium'
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
                              <span className="font-bold text-xs truncate">{link.name}</span>
                              <span className={`text-[9.5px] mt-0.5 truncate ${isActive ? 'text-sky-500/90 dark:text-cyan-400/90 font-medium' : 'text-slate-500 dark:text-slate-400 font-normal'}`}>{link.desc}</span>
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
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10 h-screen">
        
        {/* Top bar dashboard control strips */}
        <header className="sticky top-0 z-30 w-full px-4 sm:px-6 py-4">
          <div className="glass-panel-light dark:glass-panel-dark glass-card-border-light dark:glass-card-border-dark px-4 sm:px-6 py-3 rounded-2xl flex items-center justify-between shadow-premium-light dark:shadow-premium-dark relative">
            
            {/* Sidebar mobile toggle trigger & Official Branding */}
            <div className="flex items-center gap-3.5">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-500 border border-slate-200/50 dark:border-slate-800"
              >
                <Menu className="w-5 h-5" />
              </button>
              
              {/* Compact Title Group */}
              <div className="flex flex-col text-left">
                <h1 className="text-xs sm:text-sm font-black text-slate-850 dark:text-white uppercase tracking-wider flex items-center gap-2 leading-none">
                  <span className="hidden sm:inline">State Governance Terminal</span>
                  <span className="sm:hidden">TSRV OS</span>
                  <span className="px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-green-500/10 text-green-500 border border-green-500/20 animate-pulse">
                    Live
                  </span>
                </h1>
                <span className="text-[8px] text-slate-400 dark:text-slate-500 uppercase tracking-widest hidden xs:block mt-0.5">
                  Central Telemetry Node
                </span>
              </div>
            </div>

            {/* Quick Action Widgets & Interactive Notification Tray */}
            <div className="flex items-center gap-2.5">
              
              {/* Notification Bell Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className={`relative p-2.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                    notificationsOpen
                      ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-600 dark:text-cyan-400 shadow-glow-cyan/15'
                      : 'bg-slate-100 dark:bg-slate-900 border-slate-200/50 dark:border-slate-800/60 text-slate-500 hover:text-slate-800 dark:hover:text-white'
                  }`}
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border border-white dark:border-slate-900 shadow-[0_0_5px_rgba(244,63,94,0.6)] animate-pulse" />
                  )}
                </button>

                {/* Notifications Popover */}
                <AnimatePresence>
                  {notificationsOpen && (
                    <>
                      {/* Click outside backdrop close layer */}
                      <div className="fixed inset-0 z-35" onClick={() => setNotificationsOpen(false)} />
                      
                      <motion.div
                        initial={{ opacity: 0, y: 12, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 12, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-3.5 w-80 sm:w-96 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl p-4 text-left z-40"
                      >
                        <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-850 pb-2.5 mb-2.5">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-xs text-slate-800 dark:text-white uppercase tracking-wider">
                              Command Alerts
                            </span>
                            {unreadCount > 0 && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-500/10 text-rose-500 border border-rose-500/20">
                                {unreadCount} New
                              </span>
                            )}
                          </div>
                          {unreadCount > 0 && (
                            <button
                              onClick={handleMarkAllRead}
                              className="text-[10px] font-black text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer uppercase tracking-wider"
                            >
                              Mark all read
                            </button>
                          )}
                        </div>

                        <div className="flex flex-col gap-2 max-h-[250px] overflow-y-auto pr-1 custom-sidebar-scrollbar">
                          {notifications.length > 0 ? (
                            notifications.map((n) => (
                              <div
                                key={n.id}
                                onClick={() => handleToggleRead(n.id, n.read)}
                                className={`p-3 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col gap-1.5 ${
                                  n.read
                                    ? 'bg-slate-50/40 dark:bg-slate-900/20 border-slate-200/30 dark:border-slate-850/50 opacity-60'
                                    : 'bg-cyan-500/5 dark:bg-cyan-950/20 border-cyan-500/25 dark:border-cyan-500/20 shadow-sm'
                                }`}
                              >
                                <p className={`text-xs leading-relaxed ${n.read ? 'text-slate-500 dark:text-slate-450' : 'text-slate-800 dark:text-slate-100 font-extrabold'}`}>
                                  {n.message}
                                </p>
                                <span className="text-[9px] text-slate-400 dark:text-slate-550 font-bold self-end">
                                  {formatTimeAgo(n.created_at)}
                                </span>
                              </div>
                            ))
                          ) : (
                            <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500 italic">
                              No recent command notifications.
                            </div>
                          )}
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              {/* Avatar widget details */}
              <div className="flex items-center gap-2 bg-slate-100/80 border border-slate-200/50 dark:bg-slate-900/60 dark:border-slate-800/60 px-2.5 py-1.5 rounded-xl shrink-0">
                {userProfile?.profile_image ? (
                  <img 
                    src={userProfile.profile_image} 
                    alt={userProfile.full_name} 
                    className="w-6 h-6 rounded-lg object-cover shadow-glow-cyan shrink-0"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-sky-500 to-cyan-400 text-white font-black text-[10px] flex items-center justify-center uppercase shadow-glow-cyan shrink-0">
                    {userProfile?.full_name ? userProfile.full_name.split(' ').map(n => n[0]).join('').substring(0, 2) : 'ST'}
                  </div>
                )}
                <div className="hidden md:flex flex-col text-left">
                  <span className="text-[10px] font-extrabold text-slate-700 dark:text-white truncate max-w-[90px]">
                    {userProfile?.full_name || 'Student'}
                  </span>
                  <span className="text-[8px] text-slate-400 uppercase tracking-wider leading-none mt-0.5">
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
