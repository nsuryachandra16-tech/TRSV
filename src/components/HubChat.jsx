import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { Send, Users, Shield, MessageSquare, Search, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function HubChat({ user }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentChannel, setCurrentChannel] = useState(() => {
    return localStorage.getItem('tsrv_active_chat_channel') || 'GH-Global';
  });
  const [constituencies, setConstituencies] = useState([]);
  const [activeChannels, setActiveChannels] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typingUsers, setTypingUsers] = useState({}); // format: { userId: { name, role } }
  const [socketConnected, setSocketConnected] = useState(false);

  useEffect(() => {
    localStorage.setItem('tsrv_active_chat_channel', currentChannel);
  }, [currentChannel]);

  // Editing state
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingText, setEditingText] = useState('');

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const isDevOrSupreme = user.role === 'dev' || user.role === 'supreme_admin';

  // 1. Fetch active channels for Dev / Supreme
  const fetchActiveChannels = () => {
    if (isDevOrSupreme) {
      const token = localStorage.getItem('tsrv_session_token') || localStorage.getItem('token') || sessionStorage.getItem('token');
      fetch('/api/chat/active-channels', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setActiveChannels(data.channels);
          }
        })
        .catch(err => console.error('Failed to load active channels:', err));
    }
  };

  // 2. Fetch constituencies to enable channel switcher
  useEffect(() => {
    const isLeadership = user.role !== 'student';
    if (isDevOrSupreme || isLeadership) {
      fetch('/api/constituencies')
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setConstituencies(data.constituencies);
          }
        })
        .catch(err => console.error('Failed to load constituencies:', err));
      
      fetchActiveChannels();
    }
  }, [isDevOrSupreme, user.role]);

  // 3. Configure socket connection
  useEffect(() => {
    const socketUrl = import.meta.env.DEV ? 'http://localhost:5000' : window.location.origin;
    
    // Connect socket
    socketRef.current = io(socketUrl, {
      transports: ['websocket'],
      upgrade: false
    });

    socketRef.current.on('connect', () => {
      setSocketConnected(true);
      console.log('🔌 [Socket.io] Connected successfully');
      // Join initial room
      socketRef.current.emit('join_channel', currentChannel);
    });

    socketRef.current.on('disconnect', () => {
      setSocketConnected(false);
    });

    // Message listener
    socketRef.current.on('new_message', (msg) => {
      if (msg.channel_id === currentChannel) {
        setMessages(prev => {
          // Prevent duplicates
          if (prev.some(p => p.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
      // Refresh active channels list dynamically
      fetchActiveChannels();
    });

    // Message edited listener
    socketRef.current.on('message_edited', (editedMsg) => {
      if (editedMsg.channel_id === currentChannel) {
        setMessages(prev => prev.map(m => m.id === editedMsg.id ? { ...m, message_text: editedMsg.message_text, is_edited: true } : m));
      }
    });

    // Typing listeners
    socketRef.current.on('typing_start', (data) => {
      if (data.channel_id === currentChannel && data.sender_id !== user.id) {
        setTypingUsers(prev => ({
          ...prev,
          [data.sender_id]: { name: data.sender_name, role: data.sender_role }
        }));
      }
    });

    socketRef.current.on('typing_stop', (data) => {
      setTypingUsers(prev => {
        const copy = { ...prev };
        delete copy[data.sender_id];
        return copy;
      });
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [currentChannel, user.id]);

  // 4. Load historical messages on channel switch
  useEffect(() => {
    const token = localStorage.getItem('tsrv_session_token') || localStorage.getItem('token') || sessionStorage.getItem('token');
    fetch(`/api/chat/history/${currentChannel}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setMessages(data.messages);
        } else {
          console.error('Failed to load chat history:', data.message);
        }
      })
      .catch(err => console.error('Error fetching chat history:', err));

    // Clear typing users for new channel
    setTypingUsers({});

    // Emit join event if socket is ready
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('join_channel', currentChannel);
    }
  }, [currentChannel]);

  // 5. Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  // 6. Typing Handlers
  const handleTyping = () => {
    if (!socketRef.current) return;

    // Send typing start event
    socketRef.current.emit('typing_start', {
      channel_id: currentChannel,
      sender_id: user.id,
      sender_name: user.full_name,
      sender_role: user.role
    });

    // Clear old timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current.emit('typing_stop', {
        channel_id: currentChannel,
        sender_id: user.id
      });
    }, 2000);
  };

  // 7. Send Message handler
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !socketRef.current) return;

    // Emit socket event (saves message in DB internally on server)
    socketRef.current.emit('send_message', {
      channel_id: currentChannel,
      sender_id: user.id,
      message_text: newMessage.trim()
    });

    // Clear typing immediately
    socketRef.current.emit('typing_stop', {
      channel_id: currentChannel,
      sender_id: user.id
    });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    setNewMessage('');
  };

  // Find user's constituency ID from the list
  const userConstituencyObj = constituencies.find(c => c.constituency_name === user.constituency_name);
  const userConstituencyId = userConstituencyObj?.id;

  // Filter constituencies based on search bar input and user authorization
  const filteredConstituencies = constituencies.filter(c => {
    // Dev/Supreme can see everything
    if (isDevOrSupreme) {
      return c.constituency_name.toLowerCase().includes(searchTerm.toLowerCase());
    }
    // Parent hub admins can see their sub-constituencies
    if (userConstituencyId && c.parent_id === userConstituencyId) {
      return c.constituency_name.toLowerCase().includes(searchTerm.toLowerCase());
    }
    return false;
  });

  // Helper to format role names elegantly
  const formatRole = (role) => {
    if (role === 'dev') return 'Developer';
    return role.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  // Helper to get role colors
  const getRoleColors = (role) => {
    if (role === 'dev') return { text: 'text-rose-400 bg-rose-500/10 border-rose-500/20', glow: 'shadow-[0_0_8px_rgba(244,63,94,0.15)] border-rose-500/30' };
    if (role === 'supreme_admin') return { text: 'text-violet-400 bg-violet-500/10 border-violet-500/20', glow: 'shadow-[0_0_8px_rgba(139,92,246,0.15)] border-violet-500/30' };
    return { text: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20', glow: 'border-slate-700/50' };
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 bg-slate-950/50 backdrop-blur-2xl border border-slate-800/60 rounded-3xl p-5 h-[calc(100vh-230px)] min-h-[520px] max-h-[720px] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] overflow-hidden">
      
      {/* SIDEBAR: Channels & Switcher */}
      <div className="col-span-1 border-r border-slate-800/40 pr-5 flex flex-col h-full overflow-hidden">
        <div className="flex items-center gap-2.5 mb-5 shrink-0">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
            <MessageSquare className="w-5 h-5 text-cyan-400" />
          </div>
          <h3 className="font-black text-slate-100 text-lg tracking-wide uppercase">Messenger</h3>
        </div>

        {/* Channels List */}
        <div className="space-y-5 flex-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-850 scrollbar-track-transparent">
          {/* Main Lounges */}
          <div className="space-y-2">
            {/* Global channel */}
            <button
              onClick={() => setCurrentChannel('GH-Global')}
              className={`w-full text-left p-3.5 rounded-2xl flex items-center gap-3.5 transition-all duration-300 cursor-pointer border ${
                currentChannel === 'GH-Global'
                  ? 'bg-gradient-to-r from-cyan-500/15 to-blue-500/5 border-cyan-500/35 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.08)]'
                  : 'bg-slate-900/25 border-slate-850/50 text-slate-400 hover:bg-slate-800/40 hover:text-slate-200 hover:border-slate-700/30'
              }`}
            >
              <div className={`p-2.5 rounded-xl transition-all duration-300 ${
                currentChannel === 'GH-Global' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-800/80 text-slate-500'
              }`}>
                <Users className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1 text-left">
                <div className="font-extrabold text-sm tracking-wide">Statewide Lounge</div>
                <div className="text-[10px] text-slate-450 mt-0.5">All State Admins</div>
              </div>
            </button>

            {/* Regular Admin Constituency channel */}
            {!isDevOrSupreme && user.constituency_name && (
              <button
                onClick={() => setCurrentChannel(`GH-Constituency-${user.constituency_name}`)}
                className={`w-full text-left p-3.5 rounded-2xl flex items-center gap-3.5 transition-all duration-300 cursor-pointer border ${
                  currentChannel === `GH-Constituency-${user.constituency_name}`
                    ? 'bg-gradient-to-r from-cyan-500/15 to-blue-500/5 border-cyan-500/35 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.08)]'
                    : 'bg-slate-900/25 border-slate-850/50 text-slate-400 hover:bg-slate-800/40 hover:text-slate-200 hover:border-slate-700/30'
                }`}
              >
                <div className={`p-2.5 rounded-xl transition-all duration-300 ${
                  currentChannel === `GH-Constituency-${user.constituency_name}` ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800/80 text-slate-500'
                }`}>
                  <Shield className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <div className="font-extrabold text-sm tracking-wide">{user.constituency_name} Chat</div>
                  <div className="text-[10px] text-slate-450 mt-0.5">Local Area Group</div>
                </div>
              </button>
            )}
          </div>

          {/* Dev/Supreme Admin Active Groups list */}
          {isDevOrSupreme && activeChannels.filter(c => c.channel_id !== 'GH-Global').length > 0 && (
            <div className="pt-3 flex flex-col border-t border-slate-800/50 gap-2">
              <span className="text-[9px] font-black text-cyan-400/90 uppercase tracking-widest px-1 block">
                Active Group Chats
              </span>
              <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-850">
                {activeChannels.filter(c => c.channel_id !== 'GH-Global').map((ch, idx) => {
                  const isActive = currentChannel === ch.channel_id;
                  const constituencyName = ch.channel_id.replace('GH-Constituency-', '');
                  return (
                    <button
                      key={ch.channel_id}
                      onClick={() => setCurrentChannel(ch.channel_id)}
                      className={`w-full text-left p-3 rounded-xl border transition-all duration-300 cursor-pointer ${
                        isActive
                          ? 'bg-cyan-500/10 border-cyan-500/35 text-cyan-200 font-extrabold shadow-[0_0_12px_rgba(6,182,212,0.05)]'
                          : 'bg-slate-900/15 border-slate-850/40 text-slate-400 hover:bg-slate-800/30 hover:text-slate-200'
                      }`}
                    >
                      <div className="text-xs flex items-center justify-between">
                        <span className="truncate">Group {idx + 1}: {constituencyName}</span>
                        {isActive && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shrink-0 ml-1.5" />}
                      </div>
                      {ch.participants && ch.participants.length > 0 && (
                        <div className="text-[9px] text-slate-450 mt-1.5 truncate">
                          👥 {ch.participants.map(p => `${p.name} (${formatRole(p.role)})`).join(', ')}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Area Switcher (Dev/Supreme or Parent Hub leaders) */}
          {(isDevOrSupreme || filteredConstituencies.length > 0) && (
            <div className="pt-3 flex flex-col border-t border-slate-800/50 gap-2.5">
              <span className="text-[9px] font-black text-rose-400/90 uppercase tracking-widest px-1 block">
                {isDevOrSupreme ? 'All Area Switcher' : 'Sub-Area Switcher'}
              </span>
              
              {/* Search bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search Area..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800/60 focus:border-rose-500/40 focus:ring-1 focus:ring-rose-500/10 text-xs rounded-xl py-2.5 pl-9 pr-3 text-slate-200 focus:outline-none placeholder-slate-650"
                />
              </div>

              {/* Scrollable list */}
              <div className="space-y-1.5 overflow-y-auto max-h-[160px] pr-1 scrollbar-thin scrollbar-thumb-slate-850">
                {filteredConstituencies.map((c) => {
                  const channelKey = `GH-Constituency-${c.constituency_name}`;
                  const isActive = currentChannel === channelKey;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setCurrentChannel(channelKey)}
                      className={`w-full text-left py-2.5 px-3.5 rounded-xl text-[11px] font-semibold transition-all duration-300 flex items-center justify-between cursor-pointer border ${
                        isActive
                          ? 'bg-rose-500/10 border-rose-500/30 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.08)]'
                          : 'bg-slate-900/10 border-transparent text-slate-400 hover:bg-slate-800/30 hover:text-slate-200 hover:border-slate-700/20'
                      }`}
                    >
                      <span className="truncate">📍 {c.constituency_name}</span>
                      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse shrink-0 ml-1.5" />}
                    </button>
                  );
                })}
                {filteredConstituencies.length === 0 && (
                  <div className="text-[11px] text-slate-500 text-center py-4">No area match.</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Socket status */}
        <div className="mt-4 pt-3.5 border-t border-slate-800/40 flex items-center justify-between text-xs shrink-0">
          <span className="text-slate-400 font-medium">Live Server Status</span>
          <span className="flex items-center gap-2 bg-slate-950/40 border border-slate-800/40 px-2.5 py-1 rounded-full">
            <span className="relative flex h-2 w-2">
              {socketConnected && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${socketConnected ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`} />
            </span>
            <span className={`text-[10px] font-extrabold uppercase tracking-wide ${socketConnected ? 'text-emerald-400' : 'text-rose-400'}`}>
              {socketConnected ? 'Online' : 'Reconnecting'}
            </span>
          </span>
        </div>
      </div>

      {/* CHAT DISPLAY WINDOW */}
      <div className="col-span-1 lg:col-span-3 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="pb-3.5 border-b border-slate-800/40 flex items-center justify-between shrink-0">
          <div>
            <h4 className="font-extrabold text-slate-100 text-base tracking-wide flex items-center gap-2">
              {currentChannel === 'GH-Global' 
                ? '🌐 Statewide Governance Lounge' 
                : `📍 Group: ${currentChannel.replace('GH-Constituency-', '')}`
              }
            </h4>
            <p className="text-xs text-slate-400 mt-1 font-medium">Secure real-time encrypted coordination channel</p>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-cyan-400 bg-cyan-950/30 border border-cyan-850/40 px-3 py-1.5 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.05)]">
            <Info className="w-3.5 h-3.5" />
            <span>Admins Only</span>
          </div>
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto py-5 space-y-5 px-2 scrollbar-thin scrollbar-thumb-slate-850">
          {messages.map((msg) => {
            const isMe = msg.sender_id === user.id;
            const roleStyle = getRoleColors(msg.sender_role);
            return (
              <div
                key={msg.id}
                className={`flex flex-col max-w-[80%] sm:max-w-[70%] transition-all duration-300 ${isMe ? 'ml-auto items-end' : 'mr-auto items-start'}`}
              >
                {/* Meta info header */}
                <div className="flex items-center gap-2 mb-1.5 text-[10px]">
                  <span className="font-bold text-slate-200">{msg.sender_name}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[8px] font-black border uppercase tracking-widest ${roleStyle.text}`}>
                    {formatRole(msg.sender_role)}
                  </span>
                  <span className="text-slate-450 font-medium">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  
                  {isMe && editingMessageId !== msg.id && (
                    <button 
                      onClick={() => {
                        setEditingMessageId(msg.id);
                        setEditingText(msg.message_text);
                      }}
                      className="text-slate-500 hover:text-cyan-400 ml-2 transition-colors duration-150 text-[10px] cursor-pointer flex items-center gap-1 font-semibold"
                      title="Edit message"
                    >
                      ✏️ Edit
                    </button>
                  )}
                </div>

                {/* Message Bubble */}
                <div
                  className={`p-3.5 rounded-2xl text-sm leading-relaxed border transition-all duration-300 ${
                    isMe
                      ? 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white border-0 shadow-lg shadow-cyan-950/20 rounded-tr-none font-medium'
                      : `bg-slate-900/40 text-slate-100 border border-slate-800/80 rounded-tl-none backdrop-blur-md ${roleStyle.glow}`
                  }`}
                >
                  {editingMessageId === msg.id ? (
                    <div className="flex flex-col gap-2 min-w-[220px] text-slate-900">
                      <textarea
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500/80 focus:ring-1 focus:ring-cyan-500/20"
                        rows={2}
                      />
                      <div className="flex justify-end gap-2 text-[10px]">
                        <button 
                          type="button"
                          onClick={() => setEditingMessageId(null)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-750 font-bold transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button 
                          type="button"
                          onClick={() => {
                            if (editingText.trim() && socketRef.current) {
                              socketRef.current.emit('edit_message', {
                                id: msg.id,
                                channel_id: currentChannel,
                                message_text: editingText.trim()
                              });
                            }
                            setEditingMessageId(null);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-cyan-600 text-white hover:bg-cyan-500 font-bold shadow-md shadow-cyan-900/20 transition-all cursor-pointer"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="relative group">
                      <span className="break-all whitespace-pre-wrap">{msg.message_text}</span>
                      {msg.is_edited && (
                        <span 
                          className="text-[8px] text-cyan-300 bg-cyan-950/60 border border-cyan-800/40 px-1.5 py-0.5 rounded-md ml-2 font-bold tracking-wider uppercase select-none align-middle" 
                          title="Message edited. Stored permanently for security audits."
                        >
                          edited
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 py-16">
              <div className="p-4 rounded-full bg-slate-900/30 border border-slate-800/40 mb-3 animate-pulse">
                <MessageSquare className="w-8 h-8 text-slate-500" />
              </div>
              <div className="text-sm font-black uppercase tracking-wider text-slate-400">Start of Operations Room</div>
              <div className="text-xs text-slate-650 mt-1.5 max-w-xs text-center leading-relaxed">Submit your dispatch or operational update below. All communications are logged securely.</div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Typing indicator bar */}
        <div className="h-6 text-[10px] text-cyan-400/90 font-medium pl-2 italic flex items-center mb-1 shrink-0">
          <AnimatePresence>
            {Object.keys(typingUsers).length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="flex items-center gap-2"
              >
                <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" />
                <span>
                  {Object.values(typingUsers).map(u => `${u.name} (${formatRole(u.role)})`).join(', ')}{' '}
                  {Object.keys(typingUsers).length === 1 ? 'is typing...' : 'are typing...'}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSendMessage} className="p-1 bg-slate-950/60 border border-slate-800/80 rounded-2xl flex gap-2 items-center shrink-0">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              handleTyping();
            }}
            placeholder="Type operations update..."
            className="flex-1 bg-transparent border-0 rounded-xl px-4 py-3 text-slate-200 focus:outline-none text-sm placeholder-slate-600 focus:ring-0"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 disabled:opacity-30 disabled:pointer-events-none text-white p-3 rounded-xl transition-all duration-300 shadow-md shadow-cyan-950/40 hover:scale-102 active:scale-98 flex items-center justify-center cursor-pointer mr-1"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

    </div>
  );
}
