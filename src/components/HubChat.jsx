import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { Send, Users, Shield, MessageSquare, Search, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function HubChat({ user }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentChannel, setCurrentChannel] = useState('GH-Global');
  const [constituencies, setConstituencies] = useState([]);
  const [activeChannels, setActiveChannels] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typingUsers, setTypingUsers] = useState({}); // format: { userId: { name, role } }
  const [socketConnected, setSocketConnected] = useState(false);

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
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-4 h-[calc(100vh-230px)] min-h-[520px] max-h-[720px] shadow-2xl overflow-hidden">
      
      {/* SIDEBAR: Channels & Switcher */}
      <div className="col-span-1 border-r border-slate-800/85 pr-4 flex flex-col h-full overflow-hidden">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="w-5 h-5 text-cyan-400" />
          <h3 className="font-bold text-slate-100 text-lg tracking-wide">Messenger</h3>
        </div>

        {/* Channels List */}
        <div className="space-y-4 flex-1 overflow-y-auto pr-1">
          {/* Main Lounges */}
          <div className="space-y-2">
            {/* Global channel */}
            <button
              onClick={() => setCurrentChannel('GH-Global')}
              className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-all duration-200 ${
                currentChannel === 'GH-Global'
                  ? 'bg-cyan-500/15 border border-cyan-500/30 text-cyan-200'
                  : 'bg-slate-850/40 border border-transparent text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <div className="p-2 rounded-lg bg-slate-800/80">
                <Users className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <div className="font-bold text-sm">Statewide Lounge</div>
                <div className="text-[10px] text-slate-500">All State Admins</div>
              </div>
            </button>

            {/* Regular Admin Constituency channel */}
            {!isDevOrSupreme && user.constituency_name && (
              <button
                onClick={() => setCurrentChannel(`GH-Constituency-${user.constituency_name}`)}
                className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-all duration-200 ${
                  currentChannel === `GH-Constituency-${user.constituency_name}`
                    ? 'bg-cyan-500/15 border border-cyan-500/30 text-cyan-200'
                    : 'bg-slate-850/40 border border-transparent text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                }`}
              >
                <div className="p-2 rounded-lg bg-slate-800/80">
                  <Shield className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <div className="font-bold text-sm">{user.constituency_name} Chat</div>
                  <div className="text-[10px] text-slate-500">Local Area Group</div>
                </div>
              </button>
            )}
          </div>

          {/* Dev/Supreme Admin Active Groups list */}
          {isDevOrSupreme && activeChannels.filter(c => c.channel_id !== 'GH-Global').length > 0 && (
            <div className="pt-2 flex flex-col border-t border-slate-800/60">
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest px-1 block mb-2">
                Active Group Chats
              </span>
              <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                {activeChannels.filter(c => c.channel_id !== 'GH-Global').map((ch, idx) => {
                  const isActive = currentChannel === ch.channel_id;
                  const constituencyName = ch.channel_id.replace('GH-Constituency-', '');
                  return (
                    <button
                      key={ch.channel_id}
                      onClick={() => setCurrentChannel(ch.channel_id)}
                      className={`w-full text-left p-2.5 rounded-xl border transition-all duration-200 ${
                        isActive
                          ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-200 font-bold'
                          : 'bg-slate-850/30 border-transparent text-slate-450 hover:bg-slate-800/40 hover:text-slate-200'
                      }`}
                    >
                      <div className="text-xs flex items-center justify-between">
                        <span>Group {idx + 1}: {constituencyName}</span>
                        {isActive && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />}
                      </div>
                      {ch.participants && ch.participants.length > 0 && (
                        <div className="text-[9px] text-slate-500 mt-1 truncate">
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
            <div className="pt-2 flex flex-col border-t border-slate-800/60">
              <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest px-1 block mb-2">
                {isDevOrSupreme ? 'All Area Switcher' : 'Sub-Area Switcher'}
              </span>
              
              {/* Search bar */}
              <div className="relative mb-3">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search Area..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-850 text-xs rounded-lg py-2 pl-8 pr-3 text-slate-200 focus:outline-none focus:border-rose-500/50"
                />
              </div>

              {/* Scrollable list */}
              <div className="space-y-1 overflow-y-auto max-h-[160px] pr-1">
                {filteredConstituencies.map((c) => {
                  const channelKey = `GH-Constituency-${c.constituency_name}`;
                  const isActive = currentChannel === channelKey;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setCurrentChannel(channelKey)}
                      className={`w-full text-left py-2 px-3 rounded-lg text-[11px] transition-all duration-200 flex items-center justify-between ${
                        isActive
                          ? 'bg-rose-500/10 border border-rose-500/30 text-rose-300 font-bold'
                          : 'bg-slate-950/20 border border-transparent text-slate-400 hover:bg-slate-800/40 hover:text-slate-300'
                      }`}
                    >
                      <span>📍 {c.constituency_name}</span>
                      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />}
                    </button>
                  );
                })}
                {filteredConstituencies.length === 0 && (
                  <div className="text-[11px] text-slate-600 text-center py-4">No area match.</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Socket status */}
        <div className="mt-4 pt-3 border-t border-slate-850 flex items-center justify-between text-xs">
          <span className="text-slate-500">Live Server Status</span>
          <span className="flex items-center gap-1.5 font-semibold">
            <span className={`w-2 h-2 rounded-full ${socketConnected ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`} />
            <span className={socketConnected ? 'text-emerald-400' : 'text-rose-400'}>
              {socketConnected ? 'Online' : 'Reconnecting'}
            </span>
          </span>
        </div>
      </div>

      {/* CHAT DISPLAY WINDOW */}
      <div className="col-span-1 lg:col-span-3 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="pb-3 border-b border-slate-850 flex items-center justify-between">
          <div>
            <h4 className="font-bold text-slate-100 text-base">
              {currentChannel === 'GH-Global' 
                ? '🌐 Statewide Governance Lounge' 
                : `📍 Group: ${currentChannel.replace('GH-Constituency-', '')}`
              }
            </h4>
            <p className="text-xs text-slate-500">Secure real-time encrypted connection</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-cyan-400 bg-cyan-950/20 border border-cyan-800/30 px-2.5 py-1 rounded-full">
            <Info className="w-3.5 h-3.5" />
            <span>Admins Only</span>
          </div>
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 px-2">
          {messages.map((msg) => {
            const isMe = msg.sender_id === user.id;
            const roleStyle = getRoleColors(msg.sender_role);
            return (
              <div
                key={msg.id}
                className={`flex flex-col max-w-[75%] ${isMe ? 'ml-auto items-end' : 'mr-auto items-start'}`}
              >
                {/* Meta info header */}
                <div className="flex items-center gap-2 mb-1 text-[11px]">
                  <span className="font-bold text-slate-300">{msg.sender_name}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${roleStyle.text}`}>
                    {formatRole(msg.sender_role)}
                  </span>
                  <span className="text-slate-500">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  
                  {isMe && editingMessageId !== msg.id && (
                    <button 
                      onClick={() => {
                        setEditingMessageId(msg.id);
                        setEditingText(msg.message_text);
                      }}
                      className="text-slate-500 hover:text-cyan-400 ml-1 transition-colors duration-150 text-[10px]"
                      title="Edit message"
                    >
                      ✏️ Edit
                    </button>
                  )}
                </div>

                {/* Message Bubble */}
                <div
                  className={`p-3 rounded-2xl text-sm leading-relaxed border transition-all duration-300 ${
                    isMe
                      ? 'bg-gradient-to-br from-cyan-600 to-cyan-700 text-white border-cyan-500 shadow-lg shadow-cyan-950/20 rounded-tr-none'
                      : `bg-slate-850/60 text-slate-200 border-slate-700/50 rounded-tl-none ${roleStyle.glow}`
                  }`}
                >
                  {editingMessageId === msg.id ? (
                    <div className="flex flex-col gap-2 min-w-[200px] text-slate-900">
                      <textarea
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                        rows={2}
                      />
                      <div className="flex justify-end gap-2 text-[10px]">
                        <button 
                          type="button"
                          onClick={() => setEditingMessageId(null)}
                          className="px-2 py-1 rounded bg-slate-800 text-slate-400 hover:bg-slate-750"
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
                          className="px-2 py-1 rounded bg-cyan-600 text-white hover:bg-cyan-500"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <span className="break-all whitespace-pre-wrap">{msg.message_text}</span>
                      {msg.is_edited && (
                        <span 
                          className="text-[9px] text-cyan-400/90 ml-1.5 italic font-medium select-none bg-cyan-950/40 border border-cyan-800/40 px-1.5 py-0.5 rounded-full" 
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
            <div className="h-full flex flex-col items-center justify-center text-slate-500 py-12">
              <MessageSquare className="w-8 h-8 mb-2 text-slate-600" />
              <div className="text-sm font-semibold">Start of Room Conversation</div>
              <div className="text-xs text-slate-600 mt-1">Send a message to begin real-time operations</div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Typing indicator bar */}
        <div className="h-5 text-xs text-slate-400 pl-2 italic flex items-center mb-1">
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
        <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              handleTyping();
            }}
            placeholder="Type operations update..."
            className="flex-1 bg-slate-950/90 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-cyan-500 text-sm placeholder-slate-600 shadow-inner"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 disabled:opacity-40 text-white p-3.5 rounded-xl transition-all duration-300 shadow-lg shadow-cyan-900/35 hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

    </div>
  );
}
