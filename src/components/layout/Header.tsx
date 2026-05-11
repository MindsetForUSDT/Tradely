// components/layout/Header.tsx — ИСПРАВЛЕННАЯ ВЕРСИЯ
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/providers/AppProviders'; // ✅ Исправленный импорт
import { GlowButton } from '@/components/ui/GlowButton';
import { Icon } from '@/components/ui/Icons';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

export function Header() {
  const { isAuthenticated, signOut } = useAuth();
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
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        isScrolled
          ? 'bg-cyber-950/90 backdrop-blur-xl border-b border-cyber-700/50'
          : 'bg-transparent'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between h-16 md:h-20">
          <Link
            to={isAuthenticated ? '/dashboard' : '/'}
            className="flex items-center gap-2.5 group"
          >
            <div className="w-8 h-8 rounded-lg bg-neon-cyan/10 border border-neon-cyan/20 flex items-center justify-center group-hover:border-neon-cyan/40 transition-colors">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-neon-cyan"
              >
                <path d="M3 17l4-8 4 6 6-10 3 4" />
              </svg>
            </div>
            <span className="text-lg font-bold font-display tracking-tight">
              Tradeum<span className="text-neon-cyan">Diary</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {isAuthenticated ? (
              <>
                <Link
                  to="/dashboard"
                  className={cn(
                    'text-sm px-3 py-2 rounded-lg transition-colors',
                    location.pathname === '/dashboard'
                      ? 'text-neon-cyan bg-neon-cyan/5'
                      : 'text-text-secondary hover:text-white'
                  )}
                >
                  Дашборд
                </Link>
                <Link
                  to="/dashboard/journal"
                  className={cn(
                    'text-sm px-3 py-2 rounded-lg transition-colors',
                    location.pathname.includes('/journal')
                      ? 'text-neon-cyan bg-neon-cyan/5'
                      : 'text-text-secondary hover:text-white'
                  )}
                >
                  Журнал
                </Link>
                <Link
                  to="/dashboard/wallets"
                  className={cn(
                    'text-sm px-3 py-2 rounded-lg transition-colors',
                    location.pathname.includes('/wallets')
                      ? 'text-neon-cyan bg-neon-cyan/5'
                      : 'text-text-secondary hover:text-white'
                  )}
                >
                  Кошельки
                </Link>
                <Link
                  to="/pro"
                  className="text-sm text-neon-cyan font-medium px-3 py-2 rounded-lg hover:bg-neon-cyan/5 transition-colors"
                >
                  PRO
                </Link>
                <button
                  onClick={handleSignOut}
                  className="text-sm text-text-muted hover:text-white px-3 py-2 rounded-lg transition-colors"
                >
                  Выйти
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/subscribe"
                  className="text-sm text-text-secondary hover:text-white transition-colors px-3 py-2"
                >
                  Тарифы
                </Link>
                <Link to="/">
                  <GlowButton size="sm">Войти</GlowButton>
                </Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
