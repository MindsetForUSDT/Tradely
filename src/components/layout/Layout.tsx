import { Outlet } from 'react-router-dom';
import { MouseGlow } from '@/components/ui/MouseGlow';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { Header } from './Header';
import { Footer } from './Footer';
import { MobileNav } from './MobileNav';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

export function Layout() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="relative min-h-screen flex flex-col">
      <OfflineBanner />
      <MouseGlow />
      <Header />
      <main className={cn('flex-1 relative z-10', isAuthenticated ? 'pt-20 md:pt-24 pb-20 md:pb-0' : '')}>
        <Outlet />
      </main>
      {!isAuthenticated && <Footer />}
      {isAuthenticated && <MobileNav />}
    </div>
  );
}