import React from 'react';
import { motion } from 'framer-motion';

export default function GlassCard({ 
  children, 
  className = '', 
  hoverEffect = true,
  delay = 0,
  onClick
}) {
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 100,
        damping: 15,
        delay: delay
      }
    }
  };

  const interactiveProps = hoverEffect ? {
    whileHover: { 
      y: -6, 
      scale: 1.015,
      transition: { type: 'spring', stiffness: 400, damping: 20 }
    },
    whileTap: { scale: 0.985 }
  } : {};

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-50px' }}
      {...interactiveProps}
      onClick={onClick}
      className={`
        rounded-2xl transition-all duration-300
        glass-panel-light dark:glass-panel-dark
        glass-card-border-light dark:glass-card-border-dark
        shadow-premium-light dark:shadow-premium-dark
        relative overflow-hidden
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
    >
      {/* Dynamic Glow Spotlight (Background decoration) */}
      <div className="absolute -inset-40 bg-gradient-to-tr from-sky-400/5 via-cyan-400/0 to-blue-500/5 rounded-full pointer-events-none blur-3xl opacity-0 hover:opacity-100 transition-opacity duration-700" />
      
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </motion.div>
  );
}
