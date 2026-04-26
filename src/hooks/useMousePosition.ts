// ============================================================
// TradeumDiary — Хук отслеживания позиции мыши
// Используется для эффекта свечения на лендинге
// ============================================================

import { useState, useEffect } from 'react';
import { debounce } from '@/lib/utils';

interface MousePosition {
  x: number;
  y: number;
  isMoving: boolean;
}

export function useMousePosition(): MousePosition {
  const [position, setPosition] = useState<MousePosition>({
    x: 0,
    y: 0,
    isMoving: false,
  });

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const handleMouseMove = debounce((e: MouseEvent) => {
      setPosition({
        x: e.clientX,
        y: e.clientY,
        isMoving: true,
      });

      // Сбрасываем флаг движения через 150ms
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setPosition((prev) => ({ ...prev, isMoving: false }));
      }, 150);
    }, 16); // ~60fps

    // На мобильных устройствах не отслеживаем
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    if (!isMobile) {
      window.addEventListener('mousemove', handleMouseMove, { passive: true });
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(timeoutId);
    };
  }, []);

  return position;
}