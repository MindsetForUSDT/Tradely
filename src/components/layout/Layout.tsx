import { Outlet, useLocation } from 'react-router-dom';
import { MouseGlow } from '@/components/ui/MouseGlow';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { Header } from './Header';
import { Footer } from './Footer';
import { MobileNav } from './MobileNav';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

export function Layout() {
  const location = useLocation();
  const { user } = useAuth();
  const isLanding = location.pathname === '/';

  return (
    <div className="relative min-h-screen min-h-dvh flex flex-col">
      <OfflineBanner />
      <MouseGlow />
      {!isLanding && <Header />}
      <main className={cn('flex-1 relative z-10', !isLanding && 'pt-20 md:pt-24', user && 'pb-20 md:pb-0')}>
        <Outlet />
      </main>
      {!user && <Footer />}
      {user && <MobileNav />}
    </div>
  );
}