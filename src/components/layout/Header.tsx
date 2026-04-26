// ============================================================
// TradeumDiary — Шапка приложения
// Динамическая: прозрачная на лендинге, стеклянная в дашборде
// ============================================================

import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

export function Header() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);

  // Отслеживаем скролл для изменения фона шапки
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        isScrolled
          ? 'bg-surface/80 backdrop-blur-xl border-b border-surface-border/50'
          : 'bg-transparent'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Логотип */}
          <Link
            to={user ? '/dashboard' : '/'}
            className="flex items-center gap-2.5 group"
          >
            <div className="w-8 h-8 rounded-lg bg-accent-green/10 border border-accent-green/20 flex items-center justify-center group-hover:border-accent-green/40 transition-colors">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                className="text-accent-green"
              >
                <path d="M3 17l4-8 4 6 6-10 3 4" />
              </svg>
            </div>
            <span className="text-lg font-bold tracking-tight">
              Tradeum<span className="text-accent-green">Diary</span>
            </span>
          </Link>

          {/* Навигация */}
          <nav className="hidden md:flex items-center gap-4">
            {user ? (
              <>
                <Link
                  to="/dashboard"
                  className={cn(
                    'text-sm transition-colors px-3 py-2 rounded-lg',
                    location.pathname === '/dashboard'
                      ? 'text-accent-green bg-accent-green/5'
                      : 'text-text-secondary hover:text-text-primary'
                  )}
                >
                  Дашборд
                </Link>
                <Link
                  to="/dashboard/wallets"
                  className={cn(
                    'text-sm transition-colors px-3 py-2 rounded-lg',
                    location.pathname.includes('/wallets')
                      ? 'text-accent-green bg-accent-green/5'
                      : 'text-text-secondary hover:text-text-primary'
                  )}
                >
                  Кошельки
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                >
                  Выйти
                </Button>
              </>
            ) : (
              <>
                <Link
                  to="/subscribe"
                  className="text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                  Тарифы
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/auth')}
                >
                  Войти
                </Button>
              </>
            )}
          </nav>

          {/* Мобильное меню (бургер) */}
          <button
            className="md:hidden p-2 text-text-secondary hover:text-text-primary transition-colors"
            aria-label="Меню"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}