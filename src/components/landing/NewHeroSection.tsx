import { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { GlowButton } from '@/components/ui/GlowButton';
import { Icon } from '@/components/ui/Icons';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/providers/AppProviders';

interface NewHeroSectionProps {
  onOpenContacts?: () => void;
}

export function NewHeroSection({ onOpenContacts }: NewHeroSectionProps = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const featuresRef = useRef<HTMLDivElement>(null);
  const authRef = useRef<HTMLDivElement>(null);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

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
    authRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleScrollToFeatures = () => {
    console.log('[Hero] Scrolling to features section');
    featuresRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-[#0a0a0f]">
      {/* Декоративные градиентные пятна */}
      <div className="absolute top-1/4 left-1/4 w-[800px] h-[800px] bg-indigo-500/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 py-24">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
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
              className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm"
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
              </span>
              <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider font-mono">
                v2.0 — Уже доступно
              </span>
            </motion.div>

            {/* Заголовок */}
            <div>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight text-white mb-6">
                Ваш торговый{' '}
                <span className="bg-gradient-to-r from-indigo-400 via-emerald-400 to-amber-400 bg-clip-text text-transparent">
                  интеллект
                </span>
                <br />
                <span className="text-4xl md:text-5xl lg:text-6xl text-gray-400">
                  в едином интерфейсе
                </span>
              </h1>

              <p className="text-lg md:text-xl text-gray-400 leading-relaxed max-w-2xl">
                Автоматический импорт сделок из кошельков и бирж. Глубокая аналитика в реальном
                времени. Принимайте решения на основе данных, а не эмоций.
              </p>
            </div>

            {/* CTA кнопки */}
            <div className="flex flex-wrap items-center gap-4">
              <button
                onClick={() => navigate(isAuthenticated ? '/dashboard' : '/register')}
                className="px-8 py-4 rounded-xl bg-white text-black font-semibold hover:bg-gray-100 transition-all hover:scale-105 active:scale-95 flex items-center gap-3"
              >
                <Icon name="wallet-add" size={20} />
                Начать бесплатно
              </button>
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
                  className="px-6 py-3 rounded-xl border border-white/20 text-white font-medium bg-white/5 hover:bg-white/10 hover:border-white/30 transition-all duration-150 active:scale-[0.98]"
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
                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <Icon name="chart" size={20} className="text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white font-mono">100K+</p>
                  <p className="text-xs text-gray-500">сделок обработано</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <Icon name="pro" size={20} className="text-indigo-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white font-mono">500+</p>
                  <p className="text-xs text-gray-500">трейдеров</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <Icon name="shield" size={20} className="text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white font-mono">AES-256</p>
                  <p className="text-xs text-gray-500">шифрование данных</p>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Правая часть - карточки с кнопками */}
          <motion.div
            ref={authRef}
            id="auth-section"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="flex items-center justify-center"
          >
            <div className="relative w-full max-w-md">
              {/* Карточка */}
              <div className="relative rounded-2xl bg-white/5 border border-white/10 p-8 backdrop-blur-xl">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-white mb-2">Начните сейчас</h2>
                  <p className="text-sm text-gray-400">Создайте аккаунт за пару минут</p>
                </div>

                <div className="space-y-6">
                  <Link to="/register">
                    <button className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold hover:from-emerald-600 hover:to-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25">
                      <Icon name="wallet-add" size={20} />
                      Зарегистрироваться
                    </button>
                  </Link>
                  <Link to="/login">
                    <button className="w-full px-6 py-3 rounded-xl bg-white/10 border-2 border-white/20 text-white font-medium hover:bg-white/15 hover:border-white/30 transition-all flex items-center justify-center gap-2">
                      <Icon name="wallet" size={20} />
                      Войти
                    </button>
                  </Link>
                </div>

                <p className="text-center text-xs text-gray-500 mt-6">
                  Быстро • Безопасно • Бесплатно
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
