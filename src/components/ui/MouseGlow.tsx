// ============================================================
// TradeumDiary — Компонент "свечение за мышью"
// Создаёт мягкий радиальный градиент, следующий за курсором
// ============================================================

import { useMousePosition } from '@/hooks/useMousePosition';
import { useEffect, useState } from 'react';

export function MouseGlow() {
  const { x, y, isMoving } = useMousePosition();
  const [isVisible, setIsVisible] = useState(false);

  // Показываем свечение только при движении мыши
  useEffect(() => {
    if (isMoving) {
      setIsVisible(true);
    } else {
      const timeout = setTimeout(() => setIsVisible(false), 2000);
      return () => clearTimeout(timeout);
    }
  }, [isMoving]);

  // Не рендерим на мобильных
  const [isMobile, setIsMobile] = useState(true);
  useEffect(() => {
    setIsMobile(window.matchMedia('(max-width: 768px)').matches);
  }, []);

  if (isMobile) return null;

  return (
    <div
      className="mouse-glow"
      style={{
        background: `radial-gradient(
          600px circle at ${x}px ${y}px,
          rgba(0, 255, 163, 0.07) 0%,
          rgba(0, 255, 163, 0.03) 30%,
          transparent 70%
        )`,
        opacity: isVisible ? 1 : 0,
      }}
      aria-hidden="true"
    />
  );
}