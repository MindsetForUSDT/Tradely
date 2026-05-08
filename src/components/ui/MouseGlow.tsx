import { useMousePosition } from '@/hooks/useMousePosition';
import { useEffect, useState } from 'react';

export function MouseGlow() {
  const { x, y, isMoving } = useMousePosition();
  const [isVisible, setIsVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(true);

  useEffect(() => {
    if (isMoving) {
      setIsVisible(true);
    } else {
      const timeout = setTimeout(() => setIsVisible(false), 2000);
      return () => clearTimeout(timeout);
    }
  }, [isMoving]);

  useEffect(() => {
    setIsMobile(window.matchMedia('(max-width: 768px)').matches);
  }, []);

  if (isMobile) return null;

  return (
    <div
      className="fixed inset-0 pointer-events-none z-0 transition-opacity duration-300"
      style={{
        background: `radial-gradient(600px circle at ${x}px ${y}px, rgba(0, 255, 163, 0.07) 0%, rgba(0, 255, 163, 0.03) 30%, transparent 70%)`,
        opacity: isVisible ? 1 : 0,
      }}
      aria-hidden="true"
    />
  );
}
