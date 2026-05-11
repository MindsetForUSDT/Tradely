import { Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { MouseGlow } from '@/components/ui/MouseGlow';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { Header } from './Header';
import { Footer } from './Footer';
import { MobileNav } from './MobileNav';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

export function Layout() {
  const location = useLocation();
  const { isAuthenticated, isLoading } = useAuth();
  const isLanding = location.pathname === '/';

  // Debug log для отслеживания состояния auth
  useEffect(() => {
    console.log('Layout: auth state changed', {
      isAuthenticated,
      isLoading,
      path: location.pathname,
    });
  }, [isAuthenticated, isLoading, location.pathname]);

  return (
    <div className="relative min-h-screen min-h-dvh flex flex-col">
      <OfflineBanner />
      <MouseGlow />
      <Header />
      <main
        className={cn(
          'flex-1 relative z-10 transition-opacity duration-300',
          isLoading && 'opacity-50',
          isLanding ? '' : 'pt-20 md:pt-24',
          isAuthenticated ? 'pb-20 md:pb-0' : ''
        )}
      >
        <Outlet />
      </main>
      {!isAuthenticated && !isLoading && <Footer />}
      {isAuthenticated && <MobileNav />}
    </div>
  );
}
