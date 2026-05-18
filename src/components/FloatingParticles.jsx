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
    const maxParticles = 600; // Perfect density for smooth 60fps performance

    const mouse = {
      x: null,
      y: null,
      radius: 200, // Area of magnetic cursor attraction
      active: false
    };

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const handleMouseMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
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
        
        // Spawn randomly at boundary edges if resetting
        if (!init) {
          if (Math.random() > 0.5) {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() > 0.5 ? 0 : canvas.height;
          }
        }

        this.vx = 0;
        this.vy = 0;
        this.speed = Math.random() * 1.6 + 0.6;
        this.size = Math.random() * 1.3 + 0.6; // Very tiny premium particles (like fine dust)
        this.life = Math.random() * 200 + 80;
        this.maxLife = this.life;
        this.alpha = 0;
        
        // Map color hue to the coordinates angle from center (creates gorgeous spectrum waves)
        const angle = Math.atan2(this.y - canvas.height / 2, this.x - canvas.width / 2);
        this.hue = Math.floor(((angle + Math.PI) / (Math.PI * 2)) * 180) + 180; // Shift from cyan to violet/orange
      }

      update() {
        this.life--;
        if (this.life <= 0) {
          this.reset();
          return;
        }

        // Fade in at start, fade out at end
        if (this.life > this.maxLife - 30) {
          this.alpha += 0.035;
        } else if (this.life < 30) {
          this.alpha -= 0.035;
        }
        this.alpha = Math.max(0, Math.min(0.8, this.alpha));

        // 1. Base Flow Field Wave Sample (sine/cosine vector fields)
        const flowAngle = Math.sin(this.x * 0.0018) * Math.cos(this.y * 0.0018) * Math.PI * 2;
        
        let targetVx = Math.cos(flowAngle) * this.speed;
        let targetVy = Math.sin(flowAngle) * this.speed;

        // 2. Cursor Swirling Attraction (Magnetic Vector Attraction)
        if (mouse.active && mouse.x !== null && mouse.y !== null) {
          const dx = mouse.x - this.x;
          const dy = mouse.y - this.y;
          const dist = Math.hypot(dx, dy);

          if (dist < mouse.radius) {
            const force = (mouse.radius - dist) / mouse.radius;
            
            // Attract/Repel gravitational pull
            const attractX = (dx / dist) * this.speed * force * 1.2;
            const attractY = (dy / dist) * this.speed * force * 1.2;

            // Orbital swirl force (draws beautiful swirling paths/comet trails around the mouse)
            const orbitX = (-dy / dist) * this.speed * force * 2.8;
            const orbitY = (dx / dist) * this.speed * force * 2.8;

            // Interpolate base flow with cursor flow
            targetVx = targetVx * (1 - force) + (attractX + orbitX) * force;
            targetVy = targetVy * (1 - force) + (attractY + orbitY) * force;
          }
        }

        // Apply velocity with smooth inertia/easing
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
        
        // curated high-end spectral HSL colors matching background light/dark boundaries
        const lightness = isDark ? 65 : 45;
        const saturation = isDark ? 85 : 75;
        
        ctx.fillStyle = `hsla(${this.hue}, ${saturation}%, ${lightness}%, ${this.alpha * 0.6})`;
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
      // Streaking comet trail lines: draw a semi-transparent layer instead of clearing
      ctx.fillStyle = isDark ? 'rgba(3, 7, 18, 0.085)' : 'rgba(248, 250, 252, 0.085)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      particles.forEach((particle) => {
        particle.update();
        particle.draw();
      });

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
