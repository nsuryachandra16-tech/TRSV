import React from 'react';
import { motion } from 'framer-motion';

export default function PremiumButton({
  children,
  onClick,
  className = '',
  variant = 'primary', // 'primary' | 'secondary' | 'glow' | 'outline'
  size = 'md', // 'sm' | 'md' | 'lg'
  icon,
  iconPosition = 'right',
  type = 'button'
}) {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-300 focus:outline-none relative overflow-hidden select-none active:scale-95';
  
  const sizeStyles = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg font-semibold'
  };

  const variantStyles = {
    primary: `
      bg-gradient-to-r from-sky-600 via-cyan-600 to-blue-700
      hover:from-sky-500 hover:via-cyan-500 hover:to-blue-600
      text-white shadow-premium-light dark:shadow-premium-dark
      hover:shadow-glow-cyan-strong dark:hover:shadow-glow-cyan-strong
      border border-cyan-400/20
    `,
    secondary: `
      glass-panel-light dark:glass-panel-dark
      glass-card-border-light dark:glass-card-border-dark
      text-slate-800 dark:text-slate-200
      hover:bg-slate-50 dark:hover:bg-slate-900/80
      shadow-premium-light dark:shadow-premium-dark
    `,
    glow: `
      bg-transparent text-cyan-600 dark:text-cyan-400
      border border-cyan-500/30 hover:border-cyan-400/80
      shadow-glow-cyan dark:shadow-glow-cyan-strong
      hover:bg-cyan-500/10 transition-shadow duration-300
    `,
    outline: `
      bg-transparent text-slate-700 dark:text-slate-300
      border border-slate-200 dark:border-slate-800
      hover:bg-slate-100/50 dark:hover:bg-slate-900/50
    `
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02, y: -1 }}
      whileTap={{ scale: 0.98 }}
      type={type}
      onClick={onClick}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {/* Laser glare light animation sweep */}
      <span className="absolute inset-0 z-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full hover:animate-[shimmer_1.5s_infinite] pointer-events-none" style={{ transform: 'skewX(-20deg)' }} />

      {/* Button content */}
      <span className="relative z-10 flex items-center gap-2">
        {icon && iconPosition === 'left' && <span className="w-5 h-5 flex items-center justify-center">{icon}</span>}
        {children}
        {icon && iconPosition === 'right' && <span className="w-5 h-5 flex items-center justify-center">{icon}</span>}
      </span>

      {/* Subtle bottom accent glow */}
      {variant === 'primary' && (
        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-[2px] bg-cyan-300/60 blur-[1px]" />
      )}
    </motion.button>
  );
}
