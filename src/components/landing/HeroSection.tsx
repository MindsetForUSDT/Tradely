import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AuthPage } from '@/components/auth/AuthPage';

export function HeroSection() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;
    const animate = () => {
      time += 0.005;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const w = canvas.width;
      const h = canvas.height;

      // HUD grid
      ctx.strokeStyle = 'rgba(0, 245, 255, 0.05)';
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

      // Data particles
      for (let i = 0; i < 20; i++) {
        const px = (Math.sin(time + i) * w) / 2 + w / 2;
        const py = (Math.cos(time * 0.7 + i) * h) / 2 + h / 2;
        ctx.fillStyle = `rgba(0, 245, 255, ${0.3 + Math.sin(time + i) * 0.2})`;
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      requestAnimationFrame(animate);
    };

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-surface">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" aria-hidden="true" />

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 py-20">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <p className="hud-text mb-6 text-neon-cyan animate-neon-pulse">
              ● TRADING TERMINAL v2.0
            </p>
            <h1 className="font-display text-5xl md:text-7xl font-bold leading-none tracking-tight mb-6">
              <span className="text-text-primary">Ваши сделки</span>
              <br />
              <span className="text-neon-cyan text-glow-cyan">под контролем</span>
            </h1>
            <p className="font-mono text-text-secondary text-sm leading-relaxed mb-8 max-w-md border-l-2 border-neon-cyan/30 pl-4">
              TradeumDiary — терминал для профессионального анализа торговых сделок. Автоматический
              импорт, real-time метрики, алгоритмические инсайты.
            </p>
            <div className="flex gap-4 font-mono text-xs text-text-muted">
              <span className="text-neon-cyan">● 100K+ сделок</span>
              <span className="text-neon-magenta">◆ 500+ трейдеров</span>
              <span>▼ онлайн</span>
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
