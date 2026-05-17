import React from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="relative p-2 rounded-xl transition-all duration-300 overflow-hidden focus:outline-none group
                 bg-slate-100 hover:bg-slate-200/80 border border-slate-200/50
                 dark:bg-slate-900/60 dark:hover:bg-slate-800/80 dark:border-slate-800/60
                 shadow-premium-light dark:shadow-premium-dark"
      aria-label="Toggle Theme"
    >
      <motion.div
        animate={{ rotate: isDark ? 360 : 0 }}
        transition={{ type: 'spring', damping: 15, stiffness: 100 }}
        className="relative z-10 w-6 h-6 flex items-center justify-center text-sky-600 dark:text-cyan-400"
      >
        {isDark ? (
          <Moon className="w-5 h-5 fill-cyan-400/20" />
        ) : (
          <Sun className="w-5 h-5 fill-sky-500/20" />
        )}
      </motion.div>

      {/* Ripple background effect on hover */}
      <span className="absolute inset-0 z-0 bg-gradient-to-r from-sky-400/10 to-cyan-400/10 dark:from-cyan-500/10 dark:to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      {/* Decorative tiny halo */}
      <span className="absolute -inset-1 z-0 rounded-xl bg-cyan-400/20 dark:bg-cyan-500/30 blur-md opacity-0 group-hover:opacity-40 transition-opacity duration-300" />
    </button>
  );
}
