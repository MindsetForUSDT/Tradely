// ============================================================
// TradeumDiary — Хиро-секция лендинга
// Гипнотический градиентный фон + форма входа
// ============================================================

import { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface HeroSectionProps {
  children: React.ReactNode;
}

export function HeroSection({ children }: HeroSectionProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isMobile, setIsMobile] = useState(true);

  useEffect(() => {
    setIsMobile(window.matchMedia('(max-width: 768px)').matches);
  }, []);

  // Анимированный градиентный фон на canvas (только на десктопе)
  useEffect(() => {
    if (isMobile) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let time = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resize();
    window.addEventListener('resize', resize);

    const animate = () => {
      time += 0.003;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Создаём несколько органически движущихся градиентных пятен
      const spots = [
        {
          x: canvas.width * 0.3 + Math.sin(time * 1.3) * 100,
          y: canvas.height * 0.4 + Math.cos(time * 0.7) * 80,
          radius: 300 + Math.sin(time * 0.5) * 50,
          color: 'rgba(0, 255, 163, 0.04)',
        },
        {
          x: canvas.width * 0.7 + Math.cos(time * 0.9) * 120,
          y: canvas.height * 0.3 + Math.sin(time * 1.1) * 100,
          radius: 250 + Math.cos(time * 0.6) * 40,
          color: 'rgba(0, 255, 163, 0.03)',
        },
        {
          x: canvas.width * 0.5 + Math.sin(time * 0.8) * 150,
          y: canvas.height * 0.6 + Math.cos(time * 0.4) * 60,
          radius: 350,
          color: 'rgba(0, 200, 150, 0.02)',
        },
      ];

      spots.forEach((spot) => {
        const gradient = ctx.createRadialGradient(
          spot.x, spot.y, 0,
          spot.x, spot.y, spot.radius
        );
        gradient.addColorStop(0, spot.color);
        gradient.addColorStop(0.5, 'rgba(0, 255, 163, 0.01)');
        gradient.addColorStop(1, 'transparent');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, [isMobile]);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Canvas с анимированным фоном (только десктоп) */}
      {!isMobile && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          aria-hidden="true"
        />
      )}

      {/* Контент */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 md:px-6 py-20 md:py-32">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Левая колонка — текст */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="text-center lg:text-left"
          >
            {/* Бейдж */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent-green/5 border border-accent-green/10 mb-8">
              <span className="w-2 h-2 rounded-full bg-accent-green animate-glow-pulse" />
              <span className="text-xs font-medium text-accent-green tracking-wide uppercase">
                Бета-версия
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-extrabold leading-[1.05] tracking-tight mb-6">
              Ваши сделки
              <br />
              <span className="text-gradient">под контролем</span>
            </h1>

            <p className="text-base md:text-lg text-text-secondary max-w-xl mx-auto lg:mx-0 leading-relaxed mb-8">
              TradeumDiary автоматически импортирует историю сделок из блокчейна,
              анализирует прибыльность и строит графики. Больше никаких Excel-таблиц.
            </p>

            {/* Статистика (социальное доказательство) */}
            <div className="flex items-center gap-8 justify-center lg:justify-start text-sm text-text-muted">
              <div className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent-green">
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span>100K+ сделок</span>
              </div>
              <div className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent-green">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 00-3-3.87" />
                  <path d="M16 3.13a4 4 0 010 7.75" />
                </svg>
                <span>500+ трейдеров</span>
              </div>
            </div>
          </motion.div>

          {/* Правая колонка — форма входа */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            {children}
          </motion.div>
        </div>
      </div>

      {/* Градиентная линия внизу */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent-green/20 to-transparent" />
    </section>
  );
}