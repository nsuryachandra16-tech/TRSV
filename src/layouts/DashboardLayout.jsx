import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Shield, 
  ShieldAlert, 
  Users, 
  UserPlus,
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
  MessageSquare,
  Fingerprint,
  Lock,
  Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/ThemeToggle';
import FloatingParticles from '../components/FloatingParticles';
import { LocalNotifications } from '@capacitor/local-notifications';
import { App } from '@capacitor/app';
import { PushNotifications } from '@capacitor/push-notifications';
import { io } from 'socket.io-client';

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;
  const { 
    userProfile, 
    logout,
    checkBiometricsAvailable,
    enableBiometricLogin,
    disableBiometricLogin
  } = useAuth();

  // Biometrics States
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [biometricsConfigured, setBiometricsConfigured] = useState(false);
  const [biometricsLoading, setBiometricsLoading] = useState(false);
  const [biometricError, setBiometricError] = useState('');
  const [promptPasswordOpen, setPromptPasswordOpen] = useState(false);
  const [confirmPasswordVal, setConfirmPasswordVal] = useState('');

  useEffect(() => {
    if (window.Capacitor) {
      const initBiometrics = async () => {
        const status = await checkBiometricsAvailable();
        if (status.isAvailable) {
          setBiometricsAvailable(true);
          setBiometricsConfigured(status.isConfigured);
        }
      };
      initBiometrics();
    }
  }, [checkBiometricsAvailable]);

  const handleToggleBiometrics = async () => {
    setBiometricError('');
    if (biometricsConfigured) {
      setBiometricsLoading(true);
      try {
        await disableBiometricLogin();
        setBiometricsConfigured(false);
        const toastId = Math.random().toString(36).substring(2, 9);
        setToasts(prev => [...prev, { id: toastId, message: "Biometric login disabled successfully.", title: "Protocol Success" }]);
        setTimeout(() => {
          setToasts(prev => prev.filter(t => t.id !== toastId));
        }, 4500);
      } catch (err) {
        setBiometricError(err.message || 'Action failed.');
      } finally {
        setBiometricsLoading(false);
      }
    } else {
      setPromptPasswordOpen(true);
    }
  };

  const handleConfirmBiometricEnable = async (e) => {
    e.preventDefault();
    setBiometricError('');
    setBiometricsLoading(true);
    try {
      const verifyRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userProfile.email, password: confirmPasswordVal })
      });
      const verifyData = await verifyRes.json();
      if (!verifyData.success) {
        throw new Error('Invalid verification password.');
      }

      await enableBiometricLogin(userProfile.email, confirmPasswordVal);
      setBiometricsConfigured(true);
      setPromptPasswordOpen(false);
      setConfirmPasswordVal('');
      
      const toastId = Math.random().toString(36).substring(2, 9);
      setToasts(prev => [...prev, { id: toastId, message: "Biometrics successfully registered for this terminal.", title: "Security Updated" }]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== toastId));
      }, 4500);
    } catch (err) {
      setBiometricError(err.message || 'Verification check failed.');
    } finally {
      setBiometricsLoading(false);
    }
  };

  const [notifications, setNotifications] = useState([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const activeLinkRef = useRef(null);
  const socketRef = useRef(null);

  const [toasts, setToasts] = useState([]);
  const prevNotificationsRef = useRef([]);

  const playNotificationSound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.12);
      
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {
      console.warn('AudioContext blocked or unsupported:', e);
    }
  };

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
      const token = localStorage.getItem('trsv_session_token');
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

  const handleMarkAllRead = async () => {
    try {
      const token = localStorage.getItem('trsv_session_token');
      await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const socketUrl = window.Capacitor
      ? 'https://trsv-union.onrender.com'
      : (import.meta.env.DEV ? 'http://localhost:5000' : window.location.origin);
    
    const token = localStorage.getItem('trsv_session_token');
    if (token) {
      socketRef.current = io(socketUrl, {
        transports: ['websocket'],
        upgrade: false,
        auth: { token }
      });

      socketRef.current.on('connect', () => {
        console.log('🔌 [DashboardLayout Socket] Global notification socket connected');
      });

      socketRef.current.on('new_notification', (notification) => {
        console.log('🔔 [DashboardLayout Socket] Real-time notification received:', notification);
        setNotifications(prev => {
          if (prev.some(p => p.id === notification.id)) return prev;
          return [notification, ...prev];
        });
      });
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5000);

    // Request permissions for native local notifications and register resume listener if running under Capacitor
    const isNative = window.Capacitor && window.Capacitor.getPlatform && window.Capacitor.getPlatform() !== 'web';
    if (isNative) {
      const requestNotificationPermissions = async () => {
        try {
          const status = await LocalNotifications.checkPermissions();
          if (status.display !== 'granted') {
            await LocalNotifications.requestPermissions();
          }
        } catch (e) {
          console.warn('[DashboardLayout] Failed to check/request notifications permissions:', e);
        }
      };
      requestNotificationPermissions();

      // Request and register for true background push notifications via FCM
      const registerPushNotifications = async () => {
        try {
          let permStatus = await PushNotifications.checkPermissions();
          if (permStatus.receive !== 'granted') {
            permStatus = await PushNotifications.requestPermissions();
          }
          if (permStatus.receive === 'granted') {
            await PushNotifications.register();
          }
        } catch (pushErr) {
          console.warn('[DashboardLayout] Push notifications registration workflow error:', pushErr.message);
        }
      };
      registerPushNotifications();

      try {
        const listenerPromise = App.addListener('appStateChange', ({ isActive }) => {
          if (isActive) {
            fetchNotifications();
          }
        });

        const actionListenerPromise = LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
          setNotificationsOpen(true);
          fetchNotifications();
          handleMarkAllRead();
        });

        const pushRegListener = PushNotifications.addListener('registration', async (tokenObj) => {
          const token = tokenObj.value;
          console.log('📡 [PushNotifications] FCM Registration Token:', token);
          const sessionToken = localStorage.getItem('trsv_session_token');
          if (sessionToken && token) {
            try {
              await fetch('/api/notifications/register-fcm', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${sessionToken}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  token: token,
                  device_info: 'Android Capacitor Native Device'
                })
              });
              console.log('✅ [PushNotifications] FCM Token saved successfully to database');
            } catch (apiErr) {
              console.error('[PushNotifications] Failed to save FCM token to backend:', apiErr.message);
            }
          }
        });

        const pushErrListener = PushNotifications.addListener('registrationError', (err) => {
          console.error('[PushNotifications] Registration error:', err.error);
        });

        const pushReceivedListener = PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('🔔 [PushNotifications] Foreground push notification received:', notification);
          fetchNotifications();
        });

        const pushActionListener = PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
          console.log('🎯 [PushNotifications] Push action performed:', action);
          setNotificationsOpen(true);
          fetchNotifications();
          handleMarkAllRead();
        });

        return () => {
          clearInterval(interval);
          listenerPromise.then(h => h.remove());
          actionListenerPromise.then(h => h.remove());
          pushRegListener.then(h => h.remove());
          pushErrListener.then(h => h.remove());
          pushReceivedListener.then(h => h.remove());
          pushActionListener.then(h => h.remove());
        };
      } catch (err) {
        console.warn('[DashboardLayout] Failed to register app listeners:', err);
      }
    }

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Only trigger toasts if we already had a baseline notifications fetch (i.e. prevNotificationsRef is not empty)
    if (prevNotificationsRef.current.length > 0) {
      const newUnread = notifications.filter(n => !n.read && !prevNotificationsRef.current.some(p => p.id === n.id));
      if (newUnread.length > 0) {
        playNotificationSound();
        newUnread.forEach(n => {
          const toastId = Math.random().toString(36).substring(2, 9);
          setToasts(prev => [...prev, { id: toastId, message: n.message, title: n.title || 'System Notification' }]);
          setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== toastId));
          }, 4500);

          // Schedule a native local push notification on mobile devices
          const isNative = window.Capacitor && window.Capacitor.getPlatform && window.Capacitor.getPlatform() !== 'web';
          if (isNative) {
            LocalNotifications.schedule({
              notifications: [
                {
                  id: Math.floor(Math.random() * 100000) + 1,
                  title: n.title || 'TRSV Alert',
                  body: n.message,
                  schedule: { at: new Date(Date.now() + 200) },
                  sound: null,
                  attachments: null,
                  actionTypeId: "",
                  extra: null
                }
              ]
            }).catch(err => {
              console.warn('[DashboardLayout] Failed to schedule native notification:', err);
            });
          }
        });
      }
    }
    prevNotificationsRef.current = notifications;
  }, [notifications]);

  // Scroll active sidebar link into view on load and navigation changes
  useEffect(() => {
    if (activeLinkRef.current) {
      activeLinkRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [pathname]);



  const handleToggleRead = async (id, currentRead) => {
    if (currentRead) return;
    try {
      const token = localStorage.getItem('trsv_session_token');
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
    if (['secretary', 'general_secretary', 'vice_president', 'president', 'state_president'].includes(userProfile.role)) return 'leader';
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
        // Only student roles can apply to join the union
        ...(userProfile?.role === 'student' ? [{
          name: 'Join TRSV',
          path: '/dashboard/join',
          icon: <UserPlus className="w-5 h-5" />,
          desc: 'Apply to join TRSV'
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
        ...(userProfile?.role !== 'student' ? [{
          name: 'QR Scanner',
          path: '/dashboard/qr-scanner',
          icon: <QrCode className="w-5 h-5" />,
          desc: 'Verify student ID cards'
        }] : [])
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
          name: 'Complaint Board',
          path: '/dashboard/transparency',
          icon: <CheckCircle className="w-5 h-5" />,
          desc: 'Verifiable complaint list'
        },
        {
          name: 'About TRSV',
          path: '/dashboard/about',
          icon: <Info className="w-5 h-5" />,
          desc: 'About TRSV union'
        },
        {
          name: 'TRSV Team',
          path: '/dashboard/team',
          icon: <Users className="w-5 h-5" />,
          desc: 'Union state leaders'
        },
        {
          name: 'Announcements',
          path: '/dashboard/announcements',
          icon: <Bell className="w-5 h-5" />,
          desc: 'Latest union announcements'
        },
        ...( ['supreme_admin', 'dev', 'state_president'].includes(userProfile?.role) ? [{
          name: 'System Logs',
          path: '/dashboard/logs',
          icon: <Activity className="w-5 h-5" />,
          desc: 'Real-time security audit logs'
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
    <div className="h-screen flex bg-trsv-bg-light dark:bg-trsv-bg-dark transition-colors duration-500 overflow-hidden relative font-sans select-none">
      
      {/* Background canvas particles */}
      <FloatingParticles />

      {/* Premium Ambient Glow Orbs */}
      <div className="fixed top-[-10%] left-[-10%] w-[45%] h-[45%] rounded-full bg-gradient-to-tr from-cyan-500/8 to-blue-500/5 dark:from-cyan-500/4 dark:to-blue-600/2 blur-[120px] pointer-events-none z-0" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[45%] h-[45%] rounded-full bg-gradient-to-br from-purple-500/8 to-cyan-500/5 dark:from-purple-500/3 dark:to-cyan-600/2 blur-[120px] pointer-events-none z-0" />

      {/* Sidebar - Desktop Layout */}
      <aside className="hidden lg:flex flex-col w-80 border-r border-slate-200/50 dark:border-slate-900/60 glass-panel-light dark:glass-panel-dark z-25 shrink-0 relative h-screen">
        {/* Brand Logo and Title */}
        <div className="p-6 border-b border-slate-200/50 dark:border-slate-900/60 flex items-center gap-3">
          <img 
            src="/trsv.jpeg" 
            alt="TRSV Logo" 
            className="w-10 h-10 rounded-2xl object-cover border border-cyan-500/30 shadow-[0_0_8px_rgba(6,182,212,0.15)] shrink-0"
          />
          <div className="text-left">
            <span className="font-black text-base tracking-tight text-slate-800 dark:text-white uppercase block">
              TRSV State OS
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
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-30 lg:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.22, ease: 'easeOut' }}
              className="fixed inset-y-0 left-0 w-80 bg-white dark:bg-slate-950 border-r border-slate-200/60 dark:border-slate-900 z-45 lg:hidden flex flex-col p-4 max-h-screen overflow-hidden shadow-2xl"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-200/50 dark:border-slate-900/60">
                <div className="flex items-center gap-3">
                  <img 
                    src="/trsv.jpeg" 
                    alt="TRSV Logo" 
                    className="w-9 h-9 rounded-xl object-cover border border-cyan-500/30 shadow-[0_0_8px_rgba(6,182,212,0.15)] shrink-0"
                  />
                  <span className="font-extrabold text-sm text-slate-800 dark:text-white uppercase tracking-wider">TRSV OS</span>
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
        <header className="sticky top-0 z-20 w-full px-4 sm:px-6 py-4">
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
                  <span className="sm:hidden">TRSV OS</span>
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
                  onClick={() => {
                    setNotificationsOpen(!notificationsOpen);
                    if (!notificationsOpen) {
                      fetchNotifications();
                      handleMarkAllRead();
                    }
                  }}
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
                        className="fixed sm:absolute left-4 right-4 sm:left-auto sm:right-0 sm:w-96 mt-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl p-4 text-left z-40"
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
              <div className="relative">
                <div 
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                  className="flex items-center gap-2 bg-slate-100/80 border border-slate-200/50 dark:bg-slate-900/60 dark:border-slate-800/60 px-2.5 py-1.5 rounded-xl shrink-0 cursor-pointer hover:bg-slate-200/55 dark:hover:bg-slate-850/70 transition-all select-none"
                >
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

                <AnimatePresence>
                  {profileMenuOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-[45]" 
                        onClick={() => setProfileMenuOpen(false)}
                      />
                      
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-60 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 p-4"
                      >
                        <div className="flex flex-col items-center text-center gap-1.5 pb-3 border-b border-slate-100 dark:border-slate-800/65">
                          {userProfile?.profile_image ? (
                            <img 
                              src={userProfile.profile_image} 
                              alt={userProfile.full_name} 
                              className="w-11 h-11 rounded-xl object-cover shadow-glow-cyan"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-sky-500 to-cyan-400 text-white font-black text-xs flex items-center justify-center uppercase shadow-glow-cyan">
                              {userProfile?.full_name ? userProfile.full_name.split(' ').map(n => n[0]).join('').substring(0, 2) : 'ST'}
                            </div>
                          )}
                          <div className="mt-0.5">
                            <h4 className="font-extrabold text-xs text-slate-850 dark:text-white leading-snug">
                              {userProfile?.full_name || 'Student'}
                            </h4>
                            <p className="text-[9px] text-slate-400 dark:text-slate-500 truncate max-w-[170px]">
                              {userProfile?.email}
                            </p>
                          </div>
                        </div>

                        <div className="py-2.5 flex flex-col gap-2">
                          {biometricsAvailable ? (
                            <div className="flex items-center justify-between px-1 py-0.5">
                              <div className="flex flex-col text-left">
                                <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                                  Fingerprint Login
                                </span>
                                <span className="text-[8px] text-slate-450 uppercase tracking-wider font-medium">
                                  {biometricsConfigured ? 'Active' : 'Disabled'}
                                </span>
                              </div>
                              <button
                                type="button"
                                disabled={biometricsLoading}
                                onClick={handleToggleBiometrics}
                                className={`w-9 h-5.5 rounded-full p-0.5 transition-colors duration-300 relative focus:outline-none cursor-pointer ${
                                  biometricsConfigured ? 'bg-cyan-500' : 'bg-slate-200 dark:bg-slate-800'
                                }`}
                              >
                                <div 
                                  className={`w-4.5 h-4.5 rounded-full bg-white shadow-md transform transition-transform duration-300 ${
                                    biometricsConfigured ? 'translate-x-3.5' : 'translate-x-0'
                                  }`}
                                />
                              </button>
                            </div>
                          ) : (
                            (window.Capacitor && window.Capacitor.getPlatform && window.Capacitor.getPlatform() !== 'web') && (
                              <div className="px-1 py-1 text-[9px] text-slate-450 dark:text-slate-550 italic text-left">
                                Hardware biometrics sensor not enrolled.
                              </div>
                            )
                          )}
                          
                          {biometricError && (
                            <div className="text-[8px] text-rose-500 text-left px-1.5 mt-0.5 bg-rose-500/10 border border-rose-500/15 py-1 rounded-md">
                              {biometricError}
                            </div>
                          )}
                        </div>

                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/65 flex flex-col">
                          <button
                            onClick={() => {
                              setProfileMenuOpen(false);
                              logout();
                            }}
                            className="w-full py-1.5 px-3 rounded-lg hover:bg-rose-500/10 text-rose-500 hover:text-rose-455 text-[10px] font-bold transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            Sign Out Terminal
                          </button>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              <ThemeToggle />
            </div>

          </div>
        </header>

        {/* Dashboard Content Outlet with zero-overflow margins */}
        <main className={`flex-1 flex flex-col p-4 sm:p-6 max-w-7xl mx-auto w-full relative min-h-0 ${
          pathname === '/dashboard/messenger' ? 'overflow-hidden' : 'overflow-y-auto'
        }`}>
          <Outlet />
        </main>

      </div>

      {/* Toast notifications container */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 max-w-sm pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="pointer-events-auto bg-slate-900/95 dark:bg-slate-950/95 border border-cyan-500/30 text-white rounded-2xl shadow-[0_10px_30px_-10px_rgba(34,211,238,0.3)] p-4 flex gap-3 text-left w-full backdrop-blur-md"
            >
              <div className="w-8 h-8 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                <Bell className="w-4 h-4 animate-pulse" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400">
                  {toast.title}
                </span>
                <p className="text-xs text-slate-200 mt-0.5 leading-relaxed font-bold">
                  {toast.message}
                </p>
              </div>
              <button 
                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                className="text-slate-400 hover:text-white p-1 ml-auto self-start shrink-0 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Biometric Password Verification Modal */}
      <AnimatePresence>
        {promptPasswordOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/75 backdrop-blur-md p-4 animate-[fadeIn_0.2s_ease-out]">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-white/98 dark:bg-slate-900/98 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 p-6 relative rounded-2xl shadow-2xl overflow-hidden text-center"
            >
              {/* Top light bar */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-sky-500 to-cyan-400" />
              
              <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-tr from-sky-500/20 to-cyan-400/20 border border-cyan-400/30 flex items-center justify-center text-cyan-400 shadow-glow-cyan mb-3">
                <Lock className="w-6 h-6 animate-pulse" />
              </div>

              <h3 className="font-extrabold text-lg text-slate-850 dark:text-white">
                Authorize Biometrics
              </h3>
              <p className="text-xs text-slate-550 dark:text-slate-400 mt-1 mb-5 leading-relaxed">
                Confirm your terminal access passkey to register biometric hardware login.
              </p>

              <form onSubmit={handleConfirmBiometricEnable} className="flex flex-col gap-4 text-left">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider">Access Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={confirmPasswordVal}
                    onChange={(e) => setConfirmPasswordVal(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border bg-white dark:bg-slate-950/60 text-sm focus:outline-none focus:border-cyan-400 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                  />
                </div>

                {biometricError && (
                  <div className="text-[10px] text-rose-500 bg-rose-500/10 border border-rose-500/20 p-2 rounded-lg text-left flex items-start gap-1">
                    <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{biometricError}</span>
                  </div>
                )}

                <div className="flex gap-3 mt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setPromptPasswordOpen(false);
                      setConfirmPasswordVal('');
                      setBiometricError('');
                    }}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-600 hover:text-slate-900 dark:text-slate-350 dark:hover:text-slate-100 text-xs font-bold transition-all duration-200"
                  >
                    Cancel
                  </button>
                  
                  <button
                    type="submit"
                    disabled={biometricsLoading}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white text-xs font-bold shadow-glow-cyan/30 transition-all duration-200"
                  >
                    {biometricsLoading ? 'Verifying...' : 'Authorize'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
