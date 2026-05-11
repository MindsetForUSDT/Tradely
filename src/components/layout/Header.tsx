// components/layout/Header.tsx — УЛУЧШЕННАЯ ВЕРСИЯ
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/providers/AppProviders';
import { GlowButton } from '@/components/ui/GlowButton';
import { Icon } from '@/components/ui/Icons';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

export function Header() {
  const { isAuthenticated, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/', { replace: true });
  };

  const NavLinks = ({ isMobile = false }: { isMobile?: boolean }) => (
    <>
      {isAuthenticated ? (
        <>
          <Link
            to="/dashboard"
            className={cn(
              'px-4 py-2 rounded-lg transition-all duration-200',
              location.pathname === '/dashboard'
                ? 'text-neon-cyan bg-neon-cyan/10 font-medium'
                : 'text-text-secondary hover:text-white hover:bg-cyber-800',
              isMobile && 'text-lg py-3'
            )}
          >
            Дашборд
          </Link>
          <Link
            to="/dashboard/journal"
            className={cn(
              'px-4 py-2 rounded-lg transition-all duration-200',
              location.pathname.includes('/journal')
                ? 'text-neon-cyan bg-neon-cyan/10 font-medium'
                : 'text-text-secondary hover:text-white hover:bg-cyber-800',
              isMobile && 'text-lg py-3'
            )}
          >
            Журнал
          </Link>
          <Link
            to="/dashboard/wallets"
            className={cn(
              'px-4 py-2 rounded-lg transition-all duration-200',
              location.pathname.includes('/wallets')
                ? 'text-neon-cyan bg-neon-cyan/10 font-medium'
                : 'text-text-secondary hover:text-white hover:bg-cyber-800',
              isMobile && 'text-lg py-3'
            )}
          >
            Кошельки
          </Link>
          <Link
            to="/pro"
            className={cn(
              'px-4 py-2 rounded-lg transition-all duration-200',
              'text-neon-magenta bg-neon-magenta/10 font-medium hover:bg-neon-magenta/20',
              isMobile && 'text-lg py-3'
            )}
          >
            PRO
          </Link>
          <button
            onClick={handleSignOut}
            className={cn(
              'px-4 py-2 rounded-lg transition-all duration-200',
              'text-text-muted hover:text-white hover:bg-cyber-800',
              isMobile && 'text-lg py-3 w-full text-left'
            )}
          >
            Выйти
          </button>
        </>
      ) : (
        <>
          <Link
            to="/subscribe"
            className={cn(
              'px-4 py-2 rounded-lg transition-all duration-200',
              'text-text-secondary hover:text-white hover:bg-cyber-800',
              isMobile && 'text-lg py-3 w-full text-left'
            )}
          >
            Тарифы
          </Link>
          <Link to="/">
            <GlowButton size={isMobile ? 'lg' : 'sm'} className="w-full">
              Войти
            </GlowButton>
          </Link>
        </>
      )}
    </>
  );

  return (
    <>
      <header
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
          isScrolled
            ? 'bg-cyber-950/90 backdrop-blur-xl border-b border-cyber-700/50 shadow-lg'
            : 'bg-transparent'
        )}
        role="banner"
      >
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Logo */}
            <Link
              to={isAuthenticated ? '/dashboard' : '/'}
              className="flex items-center gap-3 group"
              aria-label="TradeumDiary Главная"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-magenta/20 border border-neon-cyan/30 flex items-center justify-center group-hover:border-neon-cyan/50 transition-all duration-300 group-hover:scale-105">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  className="text-neon-cyan"
                >
                  <path d="M3 17l4-8 4 6 6-10 3 4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="text-xl font-bold font-display tracking-tight">
                Tradeum
                <span className="bg-gradient-to-r from-neon-cyan to-neon-magenta bg-clip-text text-transparent">
                  Diary
                </span>
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav
              className="hidden md:flex items-center gap-1"
              role="navigation"
              aria-label="Основное меню"
            >
              <NavLinks />
            </nav>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg bg-cyber-800 hover:bg-cyber-700 transition-colors"
              aria-label={isMobileMenuOpen ? 'Закрыть меню' : 'Открыть меню'}
              aria-expanded={isMobileMenuOpen}
            >
              <Icon name={isMobileMenuOpen ? 'close' : 'menu'} size={24} className="text-white" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Menu Panel */}
          <div className="absolute top-0 right-0 bottom-0 w-80 max-w-[85vw] bg-cyber-900 border-l border-cyber-700 p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-8">
              <span className="text-lg font-semibold text-white">Меню</span>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 rounded-lg hover:bg-cyber-800 transition-colors"
                aria-label="Закрыть меню"
              >
                <Icon name="close" size={20} className="text-text-muted" />
              </button>
            </div>
            <nav className="space-y-1" role="navigation">
              <NavLinks isMobile />
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
