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
      <div className="relative z-10 w-full h-full flex flex-col">
        {children}
      </div>
    </motion.div>
  );
}
