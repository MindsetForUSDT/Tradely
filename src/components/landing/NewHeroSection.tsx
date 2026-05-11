import { useRef, useEffect, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { GlowButton } from '@/components/ui/GlowButton';
import { Icon } from '@/components/ui/Icons';

interface NewHeroSectionProps {
  onOpenContacts?: () => void;
}

export function NewHeroSection({ onOpenContacts }: NewHeroSectionProps = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      opacity: number;
    }> = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    const initParticles = () => {
      particles = [];
      const count = Math.floor((canvas.width * canvas.height) / 15000);
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          size: Math.random() * 2 + 1,
          opacity: Math.random() * 0.5 + 0.2,
        });
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Сеть
      ctx.strokeStyle = 'rgba(0, 245, 255, 0.03)';
      ctx.lineWidth = 1;
      const gridSize = 80;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Частицы
      particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        // Свечение
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4);
        gradient.addColorStop(0, `rgba(0, 245, 255, ${p.opacity * 0.4})`);
        gradient.addColorStop(1, 'rgba(0, 245, 255, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2);
        ctx.fill();

        // Точка
        ctx.fillStyle = 'rgba(0, 245, 255, 1)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        // Соединения
        particles.slice(i + 1).forEach((p2) => {
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 150) {
            ctx.strokeStyle = `rgba(0, 245, 255, ${0.05 * (1 - dist / 150)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        });
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    resize();
    animate();
    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  const handleScrollToAuth = () => {
    console.log('[Hero] Scrolling to auth section');
    document.getElementById('auth-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleScrollToFeatures = () => {
    console.log('[Hero] Scrolling to features section');
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-cyber-950">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" aria-hidden="true" />

      {/* Градиентные пятна */}
      <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-neon-cyan/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-neon-magenta/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Левая часть - контент */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="space-y-8"
          >
            {/* Бейдж */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-neon-cyan/10 border border-neon-cyan/20 backdrop-blur-sm"
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-cyan opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-neon-cyan" />
              </span>
              <span className="text-xs font-semibold text-neon-cyan uppercase tracking-wider font-mono">
                v2.0 — Уже доступно
              </span>
            </motion.div>

            {/* Заголовок */}
            <div>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight text-white mb-6">
                Ваш торговый{' '}
                <span className="bg-gradient-to-r from-neon-cyan via-neon-cyan-dim to-neon-cyan bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient-x">
                  интеллект
                </span>
                <br />
                <span className="text-4xl md:text-5xl lg:text-6xl text-text-secondary">
                  в одной платформе
                </span>
              </h1>

              <p className="text-lg md:text-xl text-text-secondary leading-relaxed max-w-2xl">
                Автоматический импорт сделок из кошельков и бирж. Глубокая аналитика в реальном
                времени. Принимайте решения на основе данных, а не эмоций.
              </p>
            </div>

            {/* CTA кнопки */}
            <div className="flex flex-wrap items-center gap-4">
              <GlowButton size="lg" onClick={handleScrollToAuth}>
                <Icon name="wallet-add" size={20} />
                Начать бесплатно
              </GlowButton>
              <GlowButton variant="outline" size="lg" onClick={handleScrollToFeatures}>
                <Icon name="chart" size={20} />
                Возможности
              </GlowButton>
              {onOpenContacts && (
                <button
                  onClick={() => {
                    console.log('[Hero] Opening contacts modal');
                    onOpenContacts();
                  }}
                  className="px-6 py-3 rounded-xl border border-surface-border text-text-secondary font-medium hover:bg-surface-elevated hover:text-white transition-all duration-150 active:scale-[0.98]"
                >
                  Контакты
                </button>
              )}
            </div>

            {/* Статистика */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-wrap items-center gap-8 pt-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-neon-cyan/10 border border-neon-cyan/20 flex items-center justify-center">
                  <Icon name="chart" size={20} className="text-neon-cyan" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white font-mono">100K+</p>
                  <p className="text-xs text-text-muted">сделок обработано</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-neon-magenta/10 border border-neon-magenta/20 flex items-center justify-center">
                  <Icon name="pro" size={20} className="text-neon-magenta" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white font-mono">500+</p>
                  <p className="text-xs text-text-muted">трейдеров</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-neon-yellow/10 border border-neon-yellow/20 flex items-center justify-center">
                  <Icon name="shield" size={20} className="text-neon-yellow" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white font-mono">100%</p>
                  <p className="text-xs text-text-muted">безопасность</p>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Правая часть - форма */}
          <motion.div
            id="auth-section"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="flex items-center justify-center"
          >
            <div className="relative w-full max-w-md">
              {/* Эффект свечения */}
              <div className="absolute inset-0 bg-gradient-to-br from-neon-cyan/20 via-neon-magenta/10 to-neon-cyan/20 rounded-3xl blur-2xl animate-pulse" />

              {/* Карточка */}
              <div className="relative glass-card rounded-2xl p-1">
                <div className="bg-cyber-900/95 backdrop-blur-xl rounded-2xl p-8 border border-cyber-700/50">
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-white mb-2">Добро пожаловать</h2>
                    <p className="text-sm text-text-muted">Войдите или создайте аккаунт</p>
                  </div>

                  <div className="space-y-4">
                    <input
                      type="email"
                      placeholder="Email"
                      className="input-field"
                      aria-label="Email"
                    />
                    <input
                      type="password"
                      placeholder="Пароль"
                      className="input-field"
                      aria-label="Пароль"
                    />
                    <GlowButton size="lg" className="w-full">
                      Войти
                    </GlowButton>
                    <p className="text-center text-sm text-text-muted">
                      Нет аккаунта?{' '}
                      <button className="text-neon-cyan font-medium hover:underline">
                        Зарегистрироваться
                      </button>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Декоративная линия внизу */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-cyan/30 to-transparent" />
    </section>
  );
}
