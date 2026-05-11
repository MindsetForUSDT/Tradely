import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GlowButton } from '@/components/ui/GlowButton';
import { AuthPage } from '@/components/auth/AuthPage';
import { Icon } from '@/components/ui/Icons';

export function HeroSection() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const emailSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;
    let animId: number;

    const animate = () => {
      time += 0.003;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const w = canvas.width;
      const h = canvas.height;

      // Tech grid с градиентом
      const gradient = ctx.createLinearGradient(0, 0, w, h);
      gradient.addColorStop(0, 'rgba(0, 245, 255, 0.02)');
      gradient.addColorStop(1, 'rgba(0, 245, 255, 0.08)');
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 50) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Data nodes с анимацией
      const nodes = [
        { x: w * 0.2, y: h * 0.3 + Math.sin(time * 1.3) * 60 },
        { x: w * 0.7, y: h * 0.5 + Math.cos(time * 0.9) * 80 },
        { x: w * 0.5, y: h * 0.7 + Math.sin(time * 0.7) * 50 },
      ];

      // Connections с пульсацией
      ctx.strokeStyle = 'rgba(0, 245, 255, 0.08)';
      ctx.lineWidth = 2;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.stroke();

          // Pulsing effect на линиях
          const pulse = (Math.sin(time * 3 + i * j) + 1) / 2;
          ctx.strokeStyle = `rgba(0, 245, 255, ${0.1 + pulse * 0.1})`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.stroke();
        }
      }

      // Nodes с свечением
      for (const n of nodes) {
        // Outer glow
        const glowGradient = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, 20);
        glowGradient.addColorStop(0, 'rgba(0, 245, 255, 0.4)');
        glowGradient.addColorStop(1, 'rgba(0, 245, 255, 0)');
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(n.x, n.y, 20, 0, Math.PI * 2);
        ctx.fill();

        // Core
        ctx.fillStyle = 'rgba(0, 245, 255, 1)';
        ctx.beginPath();
        ctx.arc(n.x, n.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      animId = requestAnimationFrame(animate);
    };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resize();
    animate();
    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  const handleScrollToEmail = () => {
    emailSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-cyber-950">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" aria-hidden="true" />

      {/* Декоративные градиентные пятна */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-neon-cyan/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-neon-magenta/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 py-20">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-neon-cyan/5 border border-neon-cyan/20 mb-8 backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-neon-cyan animate-pulse" />
              <span className="text-xs font-medium text-neon-cyan uppercase tracking-widest font-mono">
                Trading Terminal v2.0
              </span>
            </div>

            <h1 className="font-display text-5xl md:text-7xl font-bold leading-[1.05] tracking-tight mb-6">
              <span className="text-white bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                Ваши сделки
              </span>
              <br />
              <span className="bg-gradient-to-r from-neon-cyan via-neon-magenta to-neon-yellow bg-clip-text text-transparent">
                под полным контролем
              </span>
            </h1>

            <p className="text-text-secondary text-lg leading-relaxed mb-8 max-w-lg border-l-4 border-neon-cyan/40 pl-5">
              Автоматический импорт сделок из кошельков и бирж. Real-time аналитика, алгоритмические
              инсайты, налоговые отчёты.
            </p>

            <div className="flex items-center gap-4 flex-wrap mb-12">
              <GlowButton
                size="lg"
                onClick={handleScrollToEmail}
                leftIcon={<Icon name="wallet-add" size={20} />}
              >
                Начать бесплатно
              </GlowButton>
              <GlowButton
                variant="outline"
                size="lg"
                onClick={() => window.open('https://youtu.be/demo', '_blank')}
              >
                Смотреть демо
              </GlowButton>
            </div>

            {/* Trust indicators с иконками */}
            <div className="flex items-center gap-8 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-neon-cyan/10 border border-neon-cyan/20 flex items-center justify-center">
                  <Icon name="chart" size={16} className="text-neon-cyan" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">100K+</p>
                  <p className="text-text-muted text-xs">сделок обработано</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-neon-magenta/10 border border-neon-magenta/20 flex items-center justify-center">
                  <Icon name="chart" size={16} className="text-neon-magenta" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">500+</p>
                  <p className="text-text-muted text-xs">активных трейдеров</p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            ref={emailSectionRef}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <div className="relative">
              {/* Декоративное свечение вокруг формы */}
              <div className="absolute inset-0 bg-gradient-to-r from-neon-cyan/20 to-neon-magenta/20 rounded-3xl blur-2xl" />
              <AuthPage />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Градиентный разделитель внизу */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-cyber-950 to-transparent pointer-events-none" />
    </section>
  );
}
