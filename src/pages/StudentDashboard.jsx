import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, BookOpen, Download, HelpCircle, FileText, ChevronRight, CheckCircle2, RefreshCw, AlertTriangle, ShieldAlert, Building, MapPin } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import GlassCard from '../components/GlassCard';
import PremiumButton from '../components/PremiumButton';
import ComplaintDetailsModal from '../components/ComplaintDetailsModal';

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { userProfile, refreshProfile } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState(null);

  // OpenStreetMap Autocomplete & Live Map States
  const [constituencies, setConstituencies] = useState([]);
  const [collegeSearch, setCollegeSearch] = useState(userProfile?.college_name || '');
  const [suggestions, setSuggestions] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [mappedMsg, setMappedMsg] = useState('');
  const [selectedConstituencyId, setSelectedConstituencyId] = useState(userProfile?.constituency_id || '');
  const [mapType, setMapType] = useState('vector'); // 'vector' | 'satellite'
  const tileLayerRef = useRef(null);
  
  const [mapInstance, setMapInstance] = useState(null);
  const [markerInstance, setMarkerInstance] = useState(null);
  const [mapResolving, setMapResolving] = useState(false);
  const [savingMap, setSavingMap] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [showWarningModal, setShowWarningModal] = useState(false);

  // Trigger luxury security alert modal on dashboard visit
  useEffect(() => {
    const accepted = localStorage.getItem('tsrv_warning_accepted');
    if (!accepted) {
      setShowWarningModal(true);
    }
  }, []);

  const handleAcceptWarning = () => {
    localStorage.setItem('tsrv_warning_accepted', 'true');
    setShowWarningModal(false);
  };

  // Evaluate if the resolved college area is active (Greater Hyderabad) or inactive (statewide, complain only)
  useEffect(() => {
    if (!selectedConstituencyId || constituencies.length === 0) return;
    const conId = parseInt(selectedConstituencyId);
    const matchedCon = constituencies.find(c => c.id === conId);
    if (matchedCon) {
      const isGH = matchedCon.id === 23 || matchedCon.parent_id === 23;
      if (isGH) {
        setMappedMsg(`✓ Automatically mapped to active regional node: ${matchedCon.constituency_name}`);
      } else {
        setMappedMsg(`⚠️ Your area (${matchedCon.constituency_name}) is not active, but you can still register a complaint!`);
      }
    }
  }, [selectedConstituencyId, constituencies]);

  // 1. Dynamic Leaflet Stylesheet, JS and Constituencies Loader
  useEffect(() => {
    // Inject Leaflet CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    link.id = 'leaflet-css';
    if (!document.getElementById('leaflet-css')) {
      document.head.appendChild(link);
    }

    // Inject Leaflet JS
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.id = 'leaflet-js';
    if (!document.getElementById('leaflet-js')) {
      document.body.appendChild(script);
    }

    const fetchConstituencies = async () => {
      try {
        const response = await fetch('/api/constituencies');
        const data = await response.json();
        if (data.success) {
          setConstituencies(data.constituencies);
        }
      } catch (error) {
        console.error('Failed to load constituencies:', error);
      }
    };

    fetchConstituencies();
  }, []);

  // 2. Initialize Leaflet Map when dashboard components are fully loaded
  useEffect(() => {
    if (loading) return;

    const timer = setInterval(() => {
      if (window.L && document.getElementById('dashboard-map')) {
        clearInterval(timer);
        initDashboardMap();
      }
    }, 100);

    return () => clearInterval(timer);
  }, [loading]);

  const initDashboardMap = () => {
    if (document.getElementById('dashboard-map') && !mapInstance) {
      const defaultLat = 17.3850; // Hyderabad Center
      const defaultLng = 78.4867;

      const map = window.L.map('dashboard-map', {
        zoomControl: true,
        scrollWheelZoom: true
      }).setView([defaultLat, defaultLng], 12);

      const tileLayer = window.L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png', {
        maxZoom: 20,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd'
      }).addTo(map);
      
      tileLayerRef.current = tileLayer;

      // Create a gorgeous locator marker
      const marker = window.L.marker([defaultLat, defaultLng], {
        draggable: true
      }).addTo(map);

      marker.bindPopup("<div class='text-[10px] font-bold text-slate-800'>📍 Drag me over your college campus!</div>").openPopup();

      setMapInstance(map);
      setMarkerInstance(marker);

      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        resolveMapCoordinates(lat, lng, marker);
      });

      marker.on('dragend', () => {
        const position = marker.getLatLng();
        resolveMapCoordinates(position.lat, position.lng, marker);
      });
    }
  };

  const handleToggleMapType = () => {
    if (!mapInstance || !tileLayerRef.current) return;
    
    mapInstance.removeLayer(tileLayerRef.current);
    
    if (mapType === 'vector') {
      const satelliteLayer = window.L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        maxZoom: 19
      }).addTo(mapInstance);
      tileLayerRef.current = satelliteLayer;
      setMapType('satellite');
    } else {
      const vectorLayer = window.L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png', {
        maxZoom: 20,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd'
      }).addTo(mapInstance);
      tileLayerRef.current = vectorLayer;
      setMapType('vector');
    }
  };

  const resolveMapCoordinates = async (lat, lng, markerRef) => {
    setMapResolving(true);
    setSaveSuccess('');
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`
      );
      const data = await response.json();
      if (data) {
        handleSelectCollege(data, false); // select it dynamically but don't pan map to keep drag smooth
      }
    } catch (err) {
      console.error('Reverse Geocode error:', err);
    } finally {
      setMapResolving(false);
    }
  };

  // 3. Debounced Search Autocomplete to Nominatim
  useEffect(() => {
    if (!collegeSearch || collegeSearch.length < 3 || collegeSearch === userProfile?.college_name) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const queryStr = encodeURIComponent(collegeSearch);
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${queryStr}&format=json&addressdetails=1&limit=5&countrycodes=in`
        );
        const data = await response.json();
        if (data && Array.isArray(data)) {
          setSuggestions(data);
          setShowDropdown(true);
        }
      } catch (err) {
        console.error('OSM Search Error:', err);
      } finally {
        setSearchLoading(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [collegeSearch]);

  const handleSelectCollege = (place, panMap = true) => {
    const selectedName = place.display_name;
    const address = place.address || {};

    setCollegeSearch(selectedName);
    setSuggestions([]);
    setShowDropdown(false);
    setMappedMsg('');

    // Attempt to automatically match place details to active constituencies
    const addressKeys = ['suburb', 'neighbourhood', 'city_district', 'county', 'state_district', 'city', 'town', 'village'];
    
    let matchedCon = null;

    for (const key of addressKeys) {
      const val = address[key];
      if (val) {
        const cleanVal = val.toLowerCase().replace(/[^a-z0-9]/g, '');
        const match = constituencies.find(con => {
          const cleanCon = con.constituency_name.toLowerCase().replace(/[^a-z0-9]/g, '');
          return cleanCon.includes(cleanVal) || cleanVal.includes(cleanCon);
        });

        if (match) {
          matchedCon = match;
          break;
        }
      }
    }

    if (matchedCon) {
      setSelectedConstituencyId(matchedCon.id.toString());
      setMappedMsg(`✓ Automatically mapped to regional node: ${matchedCon.constituency_name}`);
    } else {
      const displayLower = selectedName.toLowerCase();
      const textMatch = constituencies.find(con => {
        const cleanCon = con.constituency_name.toLowerCase().trim();
        return displayLower.includes(cleanCon);
      });

      if (textMatch) {
        setSelectedConstituencyId(textMatch.id.toString());
        setMappedMsg(`✓ Automatically mapped to regional node: ${textMatch.constituency_name}`);
      } else {
        setMappedMsg(`⚠️ Campus in future expansion node. TSRV is launching in all constituencies soon!`);
      }
    }

    // Move marker and pan map if requested
    if (panMap && mapInstance && markerInstance && place.lat && place.lon) {
      const lat = parseFloat(place.lat);
      const lng = parseFloat(place.lon);
      markerInstance.setLatLng([lat, lng]);
      mapInstance.setView([lat, lng], 15);
    }
  };

  const handleLockCoordinates = async () => {
    if (!collegeSearch) return;
    setSavingMap(true);
    setSaveSuccess('');
    try {
      const tokenVal = localStorage.getItem('tsrv_session_token');
      const response = await fetch('/api/auth/update-college', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokenVal}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          collegeName: collegeSearch,
          constituencyId: selectedConstituencyId || userProfile?.constituency_id || '1'
        })
      });
      const data = await response.json();
      if (data.success) {
        setSaveSuccess('🎉 Verified campus geolocations synchronized and locked successfully!');
        await refreshProfile();
      } else {
        setSaveSuccess(`❌ Sync failure: ${data.message}`);
      }
    } catch (err) {
      console.error(err);
      setSaveSuccess('❌ Network synchronization error.');
    } finally {
      setSavingMap(false);
    }
  };

  // Fetch real student complaints raised from database
  const fetchComplaints = async () => {
    try {
      const token = localStorage.getItem('tsrv_session_token');
      const response = await fetch('/api/complaints', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setTickets(data.complaints);
      }
    } catch (error) {
      console.error('Failed to load student grievances:', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    await refreshProfile();
    await fetchComplaints();
    setSyncing(false);
  };

  const [ticketTab, setTicketTab] = useState('active'); // 'active' | 'resolved'

  const getUrgencyBadge = (urgency) => {
    const maps = {
      critical: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
      high: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      medium: 'bg-sky-500/10 text-sky-500 border-sky-500/20',
      low: 'bg-green-500/10 text-green-500 border-green-500/20'
    };
    return maps[urgency?.toLowerCase()] || maps.medium;
  };

  const renderStatusStepper = (status) => {
    const stages = ['Complaint Registered', 'Complaint Verified', 'Solving Started', 'Solved'];
    let currentIdx = 0;
    if (status === 'Complaint Registered' || status === 'Audit Phase' || status === 'Registered') {
      currentIdx = 0;
    } else if (status === 'Complaint Verified' || status === 'Verified') {
      currentIdx = 1;
    } else if (status === 'Solving Started' || status === 'Processing' || status === 'In Progress') {
      currentIdx = 2;
    } else if (status === 'Solved' || status === 'Resolved') {
      currentIdx = 3;
    } else if (status === 'Dismissed') {
      currentIdx = -1;
    }

    if (currentIdx === -1) {
      return (
        <div className="flex items-center gap-1.5 mt-2 text-[10px] text-rose-500 font-bold">
          <AlertTriangle className="w-3.5 h-3.5" /> Dismissed / Rejected
        </div>
      );
    }

    const shortLabels = ['Registered', 'Verified', 'Solving Started', 'Solved'];

    return (
      <div className="flex items-center gap-2 mt-3 w-full bg-slate-50 dark:bg-slate-900/30 p-2.5 rounded-xl border border-slate-200/30 dark:border-slate-800">
        {stages.map((stage, idx) => {
          const isCompleted = currentIdx >= idx;
          const isActive = currentIdx === idx;
          return (
            <React.Fragment key={idx}>
              <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
                <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-black transition-all ${
                  isActive 
                    ? 'bg-cyan-500 text-white shadow-glow-cyan animate-pulse scale-110' 
                    : isCompleted 
                      ? 'bg-emerald-500 text-white' 
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-450 dark:text-slate-600'
                }`}>
                  {isCompleted ? '✓' : idx + 1}
                </div>
                <span className={`text-[8px] font-extrabold tracking-tight truncate max-w-full uppercase ${
                  isActive 
                    ? 'text-cyan-500 font-black' 
                    : isCompleted 
                      ? 'text-emerald-500' 
                      : 'text-slate-405 dark:text-slate-500'
                }`}>
                  {shortLabels[idx]}
                </span>
              </div>
              {idx < stages.length - 1 && (
                <div className={`h-0.5 flex-1 max-w-[20px] rounded transition-colors ${
                  currentIdx > idx ? 'bg-emerald-500' : 'bg-slate-250 dark:bg-slate-800'
                }`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  const activeTickets = tickets.filter(t => t.status !== 'Solved' && t.status !== 'Resolved' && t.status !== 'Dismissed');
  const resolvedTickets = tickets.filter(t => t.status === 'Solved' || t.status === 'Resolved');
  const currentTabTickets = ticketTab === 'active' ? activeTickets : resolvedTickets;

  return (
    <div className="w-full flex flex-col gap-6 text-left select-none animate-fadeIn">
      
      {/* 1. Dashboard Welcome System Card */}
      <div className="relative overflow-hidden rounded-2xl glass-panel-light dark:glass-panel-dark border border-slate-200/50 dark:border-slate-850 p-8 shadow-premium-light dark:shadow-premium-dark flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        {/* Glow ambient backing */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-cyan-500/10 to-transparent blur-xl pointer-events-none" />
        
        <div className="flex flex-col gap-2">
          {/* Subtitle/Role Tag badge */}
          <div className="inline-flex items-center gap-1.5 self-start px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 text-[10px] font-extrabold uppercase tracking-wider border border-cyan-500/20">
            Student Member Node
          </div>
          
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-800 dark:text-white flex flex-wrap items-center gap-x-2 gap-y-1">
            Welcome, {userProfile?.full_name || 'User'} <span className="text-slate-300 dark:text-slate-750 hidden sm:inline">|</span> <span className="text-gradient-cyan block sm:inline">{userProfile?.role === 'dev' ? 'Developer' : userProfile?.role === 'supreme_admin' ? 'Supreme Admin' : 'Student'}</span>
          </h2>
          
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-xl leading-relaxed">
            Registered Student Coordinator node active. Your digital identity credentials, local district cluster, and complaint records are fully synchronized with the Neon database.
          </p>
        </div>
        
        <PremiumButton 
          variant="glow" 
          size="sm" 
          onClick={handleSync}
          disabled={syncing}
          icon={<RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />}
        >
          {syncing ? 'Syncing Network...' : 'Sync Credentials'}
        </PremiumButton>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full items-stretch">
        
        {/* 2. Verified Student Identity Card */}
        <GlassCard hoverEffect={false} className="p-6 flex flex-col justify-between gap-6 border border-cyan-400/20 relative">
          <div className="absolute top-3 right-3">
            <ShieldAlert className="w-5 h-5 text-cyan-500" />
          </div>

          <div className="flex flex-col gap-4 text-left">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">State Advocacy Badge</span>
            
            <div className="flex items-center gap-4 bg-slate-100/50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200/30 dark:border-slate-850">
              {userProfile?.profile_image ? (
                <img 
                  src={userProfile.profile_image} 
                  alt={userProfile.full_name} 
                  className="w-14 h-14 rounded-full object-cover shadow-glow-cyan shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-sky-500 to-cyan-400 text-white font-black text-xl flex items-center justify-center shadow-glow-cyan uppercase shrink-0">
                  {userProfile?.full_name ? userProfile.full_name.split(' ').map(n => n[0]).join('').substring(0, 2) : 'ST'}
                </div>
              )}
              <div className="flex flex-col min-w-0">
                <span className="font-black text-base text-slate-800 dark:text-white truncate">
                  {userProfile?.full_name}
                </span>
                <span className="text-[11px] font-semibold text-cyan-500 mt-0.5 truncate">
                  {userProfile?.college_name || 'Academic Campus'}
                </span>
                <span className="text-[9px] text-slate-450 mt-0.5 font-mono">
                  ID: #{userProfile?.id ? userProfile.id.substring(0, 8).toUpperCase() : 'MOCK_ID'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 text-xs text-slate-500 dark:text-slate-400 text-left border-t border-slate-200/50 dark:border-slate-850 pt-4">
            <div className="flex justify-between">
              <span>Organization Status:</span>
              <strong className="text-slate-800 dark:text-slate-200">
                {userProfile?.role ? userProfile.role.charAt(0).toUpperCase() + userProfile.role.slice(1) : 'Student'}
              </strong>
            </div>
            <div className="flex justify-between">
              <span>Constituency Node:</span>
              <strong className="text-slate-800 dark:text-slate-250">
                {userProfile?.constituency_name || 'Telangana District'}
              </strong>
            </div>
            <div className="flex justify-between">
              <span>District:</span>
              <strong className="text-slate-800 dark:text-slate-255">
                {userProfile?.district || 'State Capital'}
              </strong>
            </div>
          </div>
        </GlassCard>

        {/* 3. Grievances Dispatch Tracker */}
        <div className="lg:col-span-2">
          <GlassCard hoverEffect={false} className="p-6 h-full flex flex-col justify-between gap-4 text-left">
            <div className="flex flex-col gap-2 border-b border-slate-200/50 dark:border-slate-850 pb-3">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-sm text-slate-700 dark:text-white uppercase tracking-wider">Grievance Dispatch Tracker</span>
                <span className="text-xs text-slate-400">{tickets.length} Logged</span>
              </div>
              
              {/* Tab Selector */}
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setTicketTab('active')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                    ticketTab === 'active'
                      ? 'bg-cyan-500 text-white border-cyan-500 shadow-glow-cyan'
                      : 'bg-white/40 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  Active Grievances ({activeTickets.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTicketTab('resolved')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                    ticketTab === 'resolved'
                      ? 'bg-cyan-500 text-white border-cyan-500 shadow-glow-cyan'
                      : 'bg-white/40 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  Resolved Grievances ({resolvedTickets.length})
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex-1 flex items-center justify-center min-h-[150px]">
                <div className="w-8 h-8 rounded-full border-2 border-t-cyan-500 border-r-transparent border-slate-850 animate-spin" />
              </div>
            ) : (
              <div className="flex-1 flex flex-col gap-3 my-2 overflow-y-auto max-h-[220px] pr-1 custom-sidebar-scrollbar min-h-[150px]">
                {currentTabTickets.length > 0 ? (
                  currentTabTickets.map((t) => (
                    <div 
                      key={t.id} 
                      onClick={() => setSelectedTicketId(t.id)}
                      className="flex flex-col p-4 rounded-xl bg-slate-100/50 dark:bg-slate-900/40 border border-slate-200/40 dark:border-slate-850 cursor-pointer hover:border-cyan-500/50 transition-all group gap-2"
                    >
                      <div className="flex items-start justify-between min-w-0">
                        <div className="flex flex-col text-left min-w-0 max-w-[70%]">
                          <span className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-1.5 truncate">
                            <FileText className="w-4 h-4 text-cyan-500 shrink-0" />
                            {t.title}
                          </span>
                          <span className="text-[10px] text-slate-400 mt-0.5 truncate flex items-center gap-1.5 flex-wrap">
                            Ticket #{t.id} • {new Date(t.created_at).toLocaleDateString()}
                            {t.attachment_url && (
                              <a 
                                href={t.attachment_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-500 dark:text-cyan-400 text-[8px] font-black uppercase tracking-wider transition-colors border border-cyan-500/15"
                                onClick={(e) => e.stopPropagation()}
                              >
                                Evidence Attached
                              </a>
                            )}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded border uppercase ${getUrgencyBadge(t.urgency)}`}>
                            {t.urgency}
                          </span>
                        </div>
                      </div>
                      
                      {/* Live Stepper */}
                      {renderStatusStepper(t.status)}
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-slate-400 text-xs">
                    <AlertTriangle className="w-8 h-8 text-slate-400 mb-2 opacity-50" />
                    No tickets in this section. Submit a case to get immediate redressal.
                  </div>
                )}
              </div>
            )}

            <PremiumButton 
              type="button"
              variant="primary" 
              size="sm" 
              className="w-full mt-2" 
              onClick={() => navigate('/dashboard/contact')}
            >
              Log New Incident Ticket
            </PremiumButton>
          </GlassCard>
        </div>

      </div>

      {/* 4. Verified Campus Spatial Coordinates Geolocator Map Hub */}
      <GlassCard hoverEffect={false} className="p-6 flex flex-col gap-5 border border-cyan-500/10 relative overflow-hidden">
        {/* Glow backing */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-cyan-500/5 to-transparent blur-2xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/40 dark:border-slate-850 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
              <Building className="w-5 h-5" />
            </div>
            <div className="flex flex-col text-left">
              <h3 className="font-black text-base text-slate-800 dark:text-white uppercase tracking-wider">
                📍 Campus Spatial Locator Node
              </h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                Drop your official campus locator pin on the high-fidelity map below to bind your verified credentials to active constituency nodes.
              </p>
            </div>
          </div>
          
          {userProfile?.college_name && (
            <span className="self-start md:self-center text-[9px] font-black bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
              ✓ Active Campus Pinned: {userProfile.college_name.split(',')[0]}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
          {/* Left Panel: College Autocomplete search and locking controls */}
          <div className="lg:col-span-2 flex flex-col gap-4 text-left">
            <div className="flex flex-col gap-1 relative">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Search or Type College Campus Name
              </label>
              
              <div className="relative">
                <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="e.g. Aurora Technological Uppal"
                  value={collegeSearch}
                  onChange={(e) => {
                    setCollegeSearch(e.target.value);
                    setSaveSuccess('');
                  }}
                  className="w-full pl-11 pr-4 py-3 rounded-xl border bg-white/40 dark:bg-slate-900/40 text-sm focus:outline-none focus:border-cyan-400 border-slate-200/60 dark:border-slate-800 text-slate-800 dark:text-slate-100 shadow-sm"
                />
                {searchLoading && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border border-t-cyan-500 border-slate-200 dark:border-slate-800 animate-spin" />
                )}
              </div>

              {/* Floating Suggestions Dropdown */}
              {showDropdown && suggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 max-h-52 overflow-y-auto rounded-xl border border-slate-200/60 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 shadow-2xl z-35 flex flex-col text-[11px] divide-y divide-slate-150 dark:divide-slate-850 animate-[fadeIn_0.15s_ease-out]">
                  {suggestions.map((place) => (
                    <button
                      key={place.place_id}
                      type="button"
                      onClick={() => handleSelectCollege(place, true)}
                      className="w-full text-left py-2.5 px-4 hover:bg-cyan-500/10 hover:text-cyan-500 dark:hover:bg-cyan-400/10 text-slate-700 dark:text-slate-250 font-medium transition-all duration-150 flex flex-col gap-0.5 cursor-pointer active:bg-cyan-500/20"
                    >
                      <span className="font-bold truncate">{place.name || place.display_name}</span>
                      <span className="text-[9px] text-slate-400 dark:text-slate-500 truncate">{place.display_name}</span>
                    </button>
                  ))}
                  
                  <button
                    type="button"
                    onClick={() => {
                      setShowDropdown(false);
                      setMappedMsg('💡 Custom college entered manually.');
                    }}
                    className="w-full text-left py-2.5 px-4 hover:bg-cyan-500/10 hover:text-cyan-500 dark:hover:bg-cyan-400/10 text-slate-750 dark:text-slate-250 font-bold transition-all duration-150 flex flex-col gap-0.5 cursor-pointer active:bg-cyan-500/20 border-t border-slate-200/40"
                  >
                    <span className="font-extrabold text-cyan-500">✨ Click to type custom campus name</span>
                    <span className="text-[9px] text-slate-400 dark:text-slate-500">Keep: "{collegeSearch}"</span>
                  </button>
                </div>
              )}

              {/* No suggestions helper */}
              {showDropdown && suggestions.length === 0 && collegeSearch.length >= 3 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800 bg-white/95 dark:bg-slate-955/95 shadow-2xl z-35 flex flex-col gap-1 text-[11px] animate-[fadeIn_0.15s_ease-out]">
                  <span className="font-bold text-slate-800 dark:text-slate-255">🔍 No OpenStreetMap matches found</span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDropdown(false);
                      setMappedMsg('💡 Custom college entered manually.');
                    }}
                    className="text-left text-cyan-500 font-extrabold hover:underline mt-1 cursor-pointer"
                  >
                    ✨ Click here to keep typed name: "{collegeSearch}"
                  </button>
                </div>
              )}
            </div>

            {/* Resolved constituency badge */}
            {mappedMsg && (
              <div className="p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/15 text-[10px] font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider flex items-center gap-1.5 animate-scaleUp">
                {mappedMsg}
              </div>
            )}

            {/* Manual constituency overriding select option */}
            <div className="flex flex-col gap-1 mt-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Electoral Node Constituency Map
              </label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select
                  value={selectedConstituencyId}
                  onChange={(e) => setSelectedConstituencyId(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl border bg-white/40 dark:bg-slate-900/40 text-sm focus:outline-none focus:border-cyan-400 border-slate-200/60 dark:border-slate-800 text-slate-850 dark:text-slate-100"
                >
                  {constituencies.map(con => (
                    <option key={con.id} value={con.id}>{con.constituency_name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Sync locking button */}
            <PremiumButton
              type="button"
              variant="glow"
              size="md"
              className="w-full mt-2"
              onClick={handleLockCoordinates}
              disabled={savingMap || !collegeSearch}
            >
              {savingMap ? 'Locking Coordinates...' : 'Lock Campus Coordinates'}
            </PremiumButton>

            {saveSuccess && (
              <p className={`text-[10px] font-bold uppercase tracking-wider mt-1 text-left ${saveSuccess.startsWith('❌') ? 'text-rose-500' : 'text-emerald-500 dark:text-emerald-400'}`}>
                {saveSuccess}
              </p>
            )}
          </div>

          {/* Right Panel: Massive leaflet map canvas */}
          <div className="lg:col-span-3 w-full flex flex-col gap-2 relative">
            <div className="rounded-xl overflow-hidden border border-slate-200/60 dark:border-slate-800 bg-white/40 dark:bg-slate-950/40 p-1 shadow-glow-cyan/5 relative">
              {/* Premium Map Type Toggle pill button */}
              <button
                type="button"
                onClick={handleToggleMapType}
                className="absolute top-3 right-3 z-[1000] flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200/60 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 hover:bg-white dark:hover:bg-slate-950 text-slate-800 dark:text-white text-[10px] font-black uppercase tracking-wider transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] cursor-pointer shadow-md select-none"
              >
                {mapType === 'vector' ? '🛰️ Satellite View' : '🗺️ Detailed Map'}
              </button>
              <div id="dashboard-map" className="h-64 w-full rounded-lg z-10" />
            </div>
            
            <div className="flex justify-between items-center text-[9px] text-slate-400 font-bold uppercase tracking-wider px-1">
              <span>📍 Hyderabad, Telangana Grid Cluster</span>
              {mapResolving ? (
                <span className="text-cyan-500 animate-pulse">⚡ Resolving marker pin details...</span>
              ) : (
                <span>✓ Interactive coordinates lock active</span>
              )}
            </div>
          </div>
        </div>
      </GlassCard>

      {selectedTicketId && (
        <ComplaintDetailsModal 
          ticketId={selectedTicketId} 
          onClose={() => setSelectedTicketId(null)} 
          userProfile={userProfile} 
        />
      )}

      {showWarningModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="max-w-md w-full mx-4 p-8 rounded-3xl bg-white dark:bg-slate-900 border-2 border-amber-500 shadow-2xl text-center flex flex-col items-center gap-5 relative overflow-hidden animate-scaleUp">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-amber-500/15 to-transparent blur-xl pointer-events-none" />
            
            {/* Glowing warning icon container */}
            <div className="w-16 h-16 rounded-full bg-amber-500/10 border-2 border-amber-500/40 flex items-center justify-center text-amber-600 dark:text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)] animate-bounce">
              <ShieldAlert className="w-9 h-9" />
            </div>

            <div className="flex flex-col gap-1.5 z-10">
              <h3 className="text-2xl font-black tracking-wider text-amber-600 dark:text-amber-400 uppercase">
                ⚠️ Be Alert!
              </h3>
              <p className="text-[10px] text-slate-550 dark:text-slate-400 font-extrabold uppercase tracking-widest">
                Official TSRV Student Notice
              </p>
            </div>

            <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-semibold z-10">
              Grievance tickets logged in the TSRV Command Node are transmitted directly to regional boards. 
              <span className="text-amber-600 dark:text-amber-400 font-bold block mt-1">You must file only real and genuine complaints.</span> 
              Filing simulated, fake, or false complaints is strictly prohibited and will result in permanent student credential suspension.
            </p>

            <button
              type="button"
              onClick={handleAcceptWarning}
              className="w-full z-10 py-3.5 px-6 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black uppercase text-xs tracking-wider transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.98] select-none cursor-pointer border border-amber-400/20"
            >
              OK, I Accept
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
