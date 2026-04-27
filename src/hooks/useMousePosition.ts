import { useState, useEffect } from 'react';

interface MousePosition {
  x: number;
  y: number;
  isMoving: boolean;
}

export function useMousePosition(): MousePosition {
  const [position, setPosition] = useState<MousePosition>({ x: 0, y: 0, isMoving: false });

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    if (isMobile) return;

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY, isMoving: true });
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => setPosition((prev) => ({ ...prev, isMoving: false })), 150);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(timeoutId);
    };
  }, []);

  return position;
}