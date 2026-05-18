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
    const maxParticles = 60; // Sparse, clean density for a clean layout

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    class CleanParticle {
      constructor() {
        this.reset(true);
      }

      reset(init = false) {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.speedX = (Math.random() * 0.2 - 0.1); // Extremely slow, gentle drift
        this.speedY = (Math.random() * 0.2 - 0.1);
        this.size = Math.random() * 1.5 + 0.5; // Very tiny elegant dots
        this.alpha = Math.random() * 0.12 + 0.04; // Extremely faint and subtle opacities
      }

      update() {
        // Slow float
        this.x += this.speedX;
        this.y += this.speedY;

        // Wrap around screen boundaries gently
        if (this.x < 0) this.x = canvas.width;
        if (this.x > canvas.width) this.x = 0;
        if (this.y < 0) this.y = canvas.height;
        if (this.y > canvas.height) this.y = 0;
      }

      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        
        // Single curated clean color theme based on light/dark modes
        if (isDark) {
          ctx.fillStyle = `rgba(34, 211, 238, ${this.alpha})`; // Faint cyan
        } else {
          ctx.fillStyle = `rgba(14, 165, 233, ${this.alpha})`; // Faint sky-blue
        }
        ctx.fill();
      }
    }

    const init = () => {
      particles = [];
      for (let i = 0; i < maxParticles; i++) {
        particles.push(new CleanParticle());
      }
    };

    const animate = () => {
      // Clear canvas fully to prevent paint buildup or trailing artifacts
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update and draw particles
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
