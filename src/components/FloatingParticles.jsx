import React, { useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';

export default function FloatingParticles() {
  const canvasRef = useRef(null);
  const { isDark } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let particles = [];
    const maxParticles = 550; // Perfect density for high-framerate fluid animations

    const mouse = {
      x: null,
      y: null,
      radius: 200, // Magnetic attraction bounds
      active: false,
      trail: [] // History of cursor paths
    };

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const handleMouseMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
      
      // Append coordinates to ribbon history with full initial lifetime
      mouse.trail.push({ x: e.clientX, y: e.clientY, alpha: 1.0 });
      if (mouse.trail.length > 25) {
        mouse.trail.shift();
      }
    };

    const handleMouseLeave = () => {
      mouse.x = null;
      mouse.y = null;
      mouse.active = false;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);
    
    handleResize();

    class FlowParticle {
      constructor() {
        this.reset(true);
      }

      reset(init = false) {
        this.x = init ? Math.random() * canvas.width : (Math.random() > 0.5 ? 0 : canvas.width);
        this.y = init ? Math.random() * canvas.height : Math.random() * canvas.height;
        
        // Spawn randomly at boundaries if resetting
        if (!init) {
          if (Math.random() > 0.5) {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() > 0.5 ? 0 : canvas.height;
          }
        }

        this.vx = 0;
        this.vy = 0;
        this.speed = Math.random() * 1.5 + 0.5;
        this.size = Math.random() * 1.2 + 0.6; // Ultra-tiny, elegant stardust particles
        this.life = Math.random() * 200 + 80;
        this.maxLife = this.life;
        this.alpha = 0;
        
        // Map hue to angular coordinate around the screen center (creates gorgeous spectrum flow waves)
        const angle = Math.atan2(this.y - canvas.height / 2, this.x - canvas.width / 2);
        this.hue = Math.floor(((angle + Math.PI) / (Math.PI * 2)) * 180) + 180; // Shift from cyan to violet/orange
      }

      update() {
        this.life--;
        if (this.life <= 0) {
          this.reset();
          return;
        }

        // Smooth fade-in and fade-out life cycles
        if (this.life > this.maxLife - 30) {
          this.alpha += 0.035;
        } else if (this.life < 30) {
          this.alpha -= 0.035;
        }
        this.alpha = Math.max(0, Math.min(0.8, this.alpha));

        // 1. Vector Flow Field sample (continuous sine/cosine coordinates wave fields)
        const flowAngle = Math.sin(this.x * 0.0016) * Math.cos(this.y * 0.0016) * Math.PI * 2;
        
        let targetVx = Math.cos(flowAngle) * this.speed;
        let targetVy = Math.sin(flowAngle) * this.speed;

        // 2. Gravitational vortex attraction if mouse is near
        if (mouse.active && mouse.x !== null && mouse.y !== null) {
          const dx = mouse.x - this.x;
          const dy = mouse.y - this.y;
          const dist = Math.hypot(dx, dy);

          if (dist < mouse.radius) {
            const force = (mouse.radius - dist) / mouse.radius;
            
            // Core attraction force pulling particles toward the cursor
            const attractX = (dx / dist) * this.speed * force * 1.2;
            const attractY = (dy / dist) * this.speed * force * 1.2;

            // Orbital swirling force that wraps particles into fluid swirls around the cursor
            const orbitX = (-dy / dist) * this.speed * force * 2.6;
            const orbitY = (dx / dist) * this.speed * force * 2.6;

            targetVx = targetVx * (1 - force) + (attractX + orbitX) * force;
            targetVy = targetVy * (1 - force) + (attractY + orbitY) * force;
          }
        }

        // Apply velocities with smooth momentum/inertia
        this.vx = this.vx * 0.93 + targetVx * 0.07;
        this.vy = this.vy * 0.93 + targetVy * 0.07;

        this.x += this.vx;
        this.y += this.vy;

        // Reset if offscreen bounds
        if (this.x < -10 || this.x > canvas.width + 10 || this.y < -10 || this.y > canvas.height + 10) {
          this.reset();
        }
      }

      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        
        // Curated high-end spectral HSL colors matching background light/dark modes
        const lightness = isDark ? 65 : 45;
        const saturation = isDark ? 85 : 75;
        
        ctx.fillStyle = `hsla(${this.hue}, ${saturation}%, ${lightness}%, ${this.alpha * 0.55})`;
        ctx.fill();
      }
    }

    const init = () => {
      particles = [];
      for (let i = 0; i < maxParticles; i++) {
        particles.push(new FlowParticle());
      }
    };

    const animate = () => {
      // Paint translucent trailing screen background for particle trails (gorgeous light streaks)
      ctx.fillStyle = isDark ? 'rgba(3, 7, 18, 0.09)' : 'rgba(248, 250, 252, 0.09)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Render standard particle paths
      particles.forEach((particle) => {
        particle.update();
        particle.draw();
      });

      // --- ADVANCED CURSOR INTERACTIVE EFFECTS ---

      if (mouse.active && mouse.x !== null && mouse.y !== null) {
        // 1. Magnetic Laser Constellation connections
        // Draws direct fine connecting laser lines from cursor directly to surrounding flow particles
        particles.forEach((p) => {
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          const dist = Math.hypot(dx, dy);

          if (dist < 140) {
            ctx.beginPath();
            ctx.moveTo(mouse.x, mouse.y);
            ctx.lineTo(p.x, p.y);
            
            const alpha = ((140 - dist) / 140) * (isDark ? 0.16 : 0.12);
            ctx.strokeStyle = isDark ? `rgba(34, 211, 238, ${alpha})` : `rgba(14, 165, 233, ${alpha})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        });
      }

      // 2. Shimmering Neon Ribbon Trail
      // Draws a smooth multi-colored trailing ribbon trailing behind the cursor coordinates
      if (mouse.trail.length > 1) {
        // Decay old trail point opacities
        for (let i = 0; i < mouse.trail.length; i++) {
          mouse.trail[i].alpha -= 0.035;
        }
        // Filter out expired coordinates
        mouse.trail = mouse.trail.filter(pt => pt.alpha > 0);

        // Render ribbon segment by segment with thickness and spectrum shifting near cursor
        for (let i = 0; i < mouse.trail.length - 1; i++) {
          ctx.beginPath();
          ctx.moveTo(mouse.trail[i].x, mouse.trail[i].y);
          ctx.lineTo(mouse.trail[i + 1].x, mouse.trail[i + 1].y);
          
          const segmentAlpha = mouse.trail[i].alpha * (isDark ? 0.45 : 0.3);
          
          // Color spectra shifts from purple/magenta to orange right next to the cursor
          const hue = 180 + (1.0 - mouse.trail[i].alpha) * 160; 
          ctx.strokeStyle = `hsla(${hue}, 85%, ${isDark ? 65 : 45}%, ${segmentAlpha})`;
          
          // Ribbons gets thicker as it gets closer to the active cursor
          ctx.lineWidth = 3.5 * mouse.trail[i].alpha; 
          ctx.lineCap = 'round';
          ctx.stroke();
        }
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    init();
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isDark]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none w-full h-full"
    />
  );
}
