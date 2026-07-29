import { Outlet, useLocation } from 'react-router-dom';
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
  const isAuth = ['/login', '/register', '/forgot-password', '/update-password'].includes(
    location.pathname
  );
  const isWorkspace = ['/dashboard', '/pro', '/ai', '/goals', '/achievements', '/settings'].some(
    (path) => location.pathname === path || location.pathname.startsWith(`${path}/`)
  );

  // Auth state stable — no debug logs in production

  return (
    <div className="relative min-h-screen min-h-dvh flex flex-col">
      <OfflineBanner />
      {!isWorkspace && !isAuth && <Header />}
      <main
        className={cn(
          'flex-1 relative z-10 transition-opacity duration-300',
          isLoading && !isLanding && 'opacity-50',
          isWorkspace || isAuth ? 'pt-0' : isLanding ? 'pt-16' : 'pt-20 md:pt-24',
          isAuthenticated ? 'pb-20 md:pb-0' : ''
        )}
      >
        <Outlet />
      </main>
      {!isWorkspace && !isAuth && !isAuthenticated && !isLoading && <Footer />}
      {!isWorkspace && isAuthenticated && <MobileNav />}
    </div>
  );
}
