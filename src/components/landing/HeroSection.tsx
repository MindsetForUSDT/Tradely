import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GlowButton } from '@/components/ui/GlowButton';
import { AuthPage } from '@/components/auth/AuthPage';
import { Icon } from '@/components/ui/Icons';

export function HeroSection() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

      // Tech grid
      ctx.strokeStyle = 'rgba(0, 245, 255, 0.03)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Data nodes
      const nodes = [
        { x: w * 0.2, y: h * 0.3 + Math.sin(time * 1.3) * 60 },
        { x: w * 0.7, y: h * 0.5 + Math.cos(time * 0.9) * 80 },
        { x: w * 0.5, y: h * 0.7 + Math.sin(time * 0.7) * 50 },
      ];

      // Connections
      ctx.strokeStyle = 'rgba(0, 245, 255, 0.06)';
      ctx.lineWidth = 2;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.stroke();
        }
      }

      // Nodes
      for (const n of nodes) {
        ctx.fillStyle = 'rgba(0, 245, 255, 0.8)';
        ctx.beginPath();
        ctx.arc(n.x, n.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(0, 245, 255, 0.2)';
        ctx.beginPath();
        ctx.arc(n.x, n.y, 12, 0, Math.PI * 2);
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

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-cyber-950">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" aria-hidden="true" />

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 py-20">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-neon-cyan/5 border border-neon-cyan/10 mb-8">
              <span className="w-2 h-2 rounded-full bg-neon-cyan animate-pulse" />
              <span className="text-xs font-medium text-neon-cyan uppercase tracking-widest font-mono">
                Trading Terminal v2.0
              </span>
            </div>

            <h1 className="font-display text-5xl md:text-7xl font-bold leading-[1.05] tracking-tight mb-6">
              <span className="text-white">Ваши сделки</span>
              <br />
              <span className="text-gradient">под контролем</span>
            </h1>

            <p className="text-text-secondary text-lg leading-relaxed mb-8 max-w-lg border-l-2 border-neon-cyan/30 pl-4">
              Автоматический импорт сделок из кошельков и бирж. Real-time аналитика, алгоритмические
              инсайты, налоговые отчёты.
            </p>

            <div className="flex items-center gap-4 flex-wrap">
              <GlowButton
                size="lg"
                onClick={() =>
                  document
                    .querySelector('input[type="email"]')
                    ?.scrollIntoView({ behavior: 'smooth' })
                }
              >
                <Icon name="wallet-add" size={18} />
                Начать бесплатно
              </GlowButton>
              <GlowButton
                variant="outline"
                size="lg"
                onClick={() => window.open('https://youtu.be/demo', '_blank')}
              >
                <Icon name="chart" size={18} />
                Смотреть демо
              </GlowButton>
            </div>

            <div className="flex items-center gap-8 mt-12 text-sm text-text-muted font-mono">
              <span className="text-neon-cyan">● 100K+ сделок</span>
              <span className="text-neon-magenta">◆ 500+ трейдеров</span>
              <span className="text-neon-yellow">▼ онлайн</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <AuthPage />
          </motion.div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-cyan/20 to-transparent" />
    </section>
  );
}
