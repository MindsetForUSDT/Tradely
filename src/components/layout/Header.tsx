import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

export function Header() {
  const { user, isAuthenticated, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/', { replace: true });
  };

  return (
    <header className={cn('fixed top-0 left-0 right-0 z-50 transition-all duration-300', isScrolled ? 'bg-surface/80 backdrop-blur-xl border-b border-surface-border/50' : 'bg-transparent')}>
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between h-16 md:h-20">
          <Link to={isAuthenticated ? '/dashboard' : '/'} className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent-green/10 border border-accent-green/20 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent-green">
                <path d="M3 17l4-8 4 6 6-10 3 4" />
              </svg>
            </div>
            <span className="text-lg font-bold">Tradeum<span className="text-accent-green">Diary</span></span>
          </Link>

          <nav className="hidden md:flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <Link to="/dashboard" className={cn('text-sm px-3 py-2 rounded-lg transition-colors', location.pathname === '/dashboard' ? 'text-accent-green bg-accent-green/5' : 'text-text-secondary hover:text-text-primary')}>Дашборд</Link>
                <Link to="/dashboard/wallets" className={cn('text-sm px-3 py-2 rounded-lg transition-colors', location.pathname.includes('/wallets') ? 'text-accent-green bg-accent-green/5' : 'text-text-secondary hover:text-text-primary')}>Кошельки</Link>
                <Button variant="ghost" size="sm" onClick={handleSignOut}>Выйти</Button>
              </>
            ) : (
              <>
                <Link to="/subscribe" className="text-sm text-text-secondary hover:text-text-primary transition-colors">Тарифы</Link>
                <Link to="/" className="text-sm text-accent-green font-medium">Войти</Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}