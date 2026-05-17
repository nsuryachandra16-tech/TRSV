import React, { useState, useEffect, useRef } from 'react';
import { Search, Command, FileText, MapPin, Radio, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  // Keyboard binding for Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      document.body.style.overflow = 'hidden';
    } else {
      setQuery('');
      setResults([]);
      document.body.style.overflow = 'unset';
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const fetchResults = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (data.success) {
          setResults(data.results);
        }
      } catch (err) {
        console.error('Omnisearch failed', err);
      } finally {
        setLoading(false);
      }
    };

    const debounceId = setTimeout(fetchResults, 300);
    return () => clearTimeout(debounceId);
  }, [query]);

  const handleSelect = (item) => {
    setIsOpen(false);
    // Depending on the result type, navigate to the correct module
    if (item.type === 'complaint') {
      navigate('/dashboard/leader'); // Usually they'll open the ticket from the queue
    } else if (item.type === 'announcement') {
      navigate('/dashboard/announcements');
    } else if (item.type === 'region') {
      navigate('/dashboard/command'); // Supreme admin maps
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[10vh] sm:pt-[20vh] px-4 animate-fadeIn">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
      
      {/* Palette Modal */}
      <div className="relative w-full max-w-2xl bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-premium-dark overflow-hidden flex flex-col animate-scaleUp">
        
        {/* Search Input Area */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-200 dark:border-slate-800">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search grievances, regions, broadcasts..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-slate-800 dark:text-white placeholder:text-slate-500 font-medium text-lg"
          />
          {loading && <div className="w-4 h-4 border-2 border-t-cyan-500 border-r-transparent rounded-full animate-spin shrink-0" />}
          <div className="flex items-center gap-1 shrink-0 ml-2">
            <kbd className="hidden sm:inline-flex items-center justify-center px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-widest border border-slate-200 dark:border-slate-700">ESC</kbd>
            <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg sm:hidden">
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Results Area */}
        <div className="flex-1 max-h-[60vh] overflow-y-auto custom-sidebar-scrollbar flex flex-col p-2 gap-1">
          {query.length < 2 && results.length === 0 && (
            <div className="p-8 text-center flex flex-col items-center justify-center gap-3 text-slate-400">
              <Command className="w-8 h-8 opacity-50" />
              <p className="text-sm font-medium">Type at least 2 characters to engage global search.</p>
            </div>
          )}

          {query.length >= 2 && results.length === 0 && !loading && (
            <div className="p-8 text-center text-slate-400 text-sm font-medium">
              No entities found matching "{query}"
            </div>
          )}

          {results.map((item, i) => (
            <button
              key={`${item.type}-${item.id}-${i}`}
              onClick={() => handleSelect(item)}
              className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors text-left group"
            >
              <div className="p-2 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-500 shrink-0 group-hover:bg-cyan-500 group-hover:text-white transition-colors">
                {item.type === 'complaint' ? <FileText className="w-5 h-5" /> : 
                 item.type === 'region' ? <MapPin className="w-5 h-5" /> : 
                 <Radio className="w-5 h-5" />}
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-sm font-bold text-slate-800 dark:text-white truncate">{item.primary_text}</span>
                <span className="text-[11px] text-slate-500 truncate">{item.secondary_text}</span>
              </div>
              <span className="shrink-0 px-2 py-1 rounded bg-slate-200 dark:bg-slate-800 text-[9px] font-black uppercase tracking-wider text-slate-500 border border-slate-300/50 dark:border-slate-700">
                {item.tag || item.type}
              </span>
            </button>
          ))}
        </div>
        
      </div>
    </div>
  );
}
