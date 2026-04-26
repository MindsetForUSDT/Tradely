// ============================================================
// TradeumDiary — Корневой Layout
// Включает MouseGlow, шапку, основной контент и футер
// ============================================================

import { Outlet, useLocation } from 'react-router-dom';
import { MouseGlow } from '@/components/ui/MouseGlow';
import { Header } from './Header';
import { Footer } from './Footer';
import { MobileNav } from './MobileNav';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

export function Layout() {
  const location = useLocation();
  const { user } = useAuth();

  // Определяем, находимся ли мы на лендинге
  const isLanding = location.pathname === '/';

  return (
    <div className="relative min-h-screen min-h-dvh flex flex-col">
      {/* Фоновое свечение за мышью */}
      <MouseGlow />

      {/* Шапка (скрыта на лендинге, там свой дизайн) */}
      {!isLanding && <Header />}

      {/* Основной контент */}
      <main
        className={cn(
          'flex-1 relative z-10',
          // На лендинге нет верхнего отступа
          !isLanding && 'pt-20 md:pt-24',
          // На мобильных добавляем отступ для нижней навигации
          user && 'pb-20 md:pb-0'
        )}
      >
        <Outlet />
      </main>

      {/* Футер (только на публичных страницах) */}
      {!user && <Footer />}

      {/* Мобильная нижняя навигация (только для авторизованных) */}
      {user && <MobileNav />}
    </div>
  );
}