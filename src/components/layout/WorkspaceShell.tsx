import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '@/components/ui/Icons';
import { useAuth } from '@/hooks/useAuth';

const sections = [
  { label: 'Обзор', href: '/dashboard', icon: 'chart' as const },
  { label: 'Сделки', href: '/dashboard/trades', icon: 'trades' as const },
  { label: 'Дневник', href: '/dashboard/journal', icon: 'journal' as const },
  { label: 'Источники', href: '/dashboard/wallets', icon: 'wallet' as const },
  { label: 'PRO-аналитика', href: '/pro', icon: 'pro' as const },
  { label: 'AI-разбор', href: '/ai', icon: 'info' as const },
  { label: 'Цели', href: '/goals', icon: 'risk' as const },
  { label: 'Достижения', href: '/achievements', icon: 'shield' as const },
];

function isCurrent(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname.startsWith(href);
}

export function WorkspaceShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, subscriptionTier, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const logout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="workspace-shell">
      <header className="workspace-mobile-head">
        <Link to="/dashboard">TradeumDiary</Link>
        <button
          type="button"
          onClick={() => setMobileOpen((value) => !value)}
          aria-expanded={mobileOpen}
          aria-label="Открыть рабочее меню"
        >
          <Icon name={mobileOpen ? 'close' : 'menu'} size={21} />
        </button>
      </header>
      <aside className={`workspace-sidebar ${mobileOpen ? 'is-open' : ''}`}>
        <Link className="workspace-brand" to="/dashboard">
          <span>T</span>
          <div>
            <strong>TradeumDiary</strong>
            <small>Signal Room</small>
          </div>
        </Link>
        <nav aria-label="Рабочее пространство">
          {sections.map((section) => (
            <Link
              key={section.href}
              to={section.href}
              className={isCurrent(location.pathname, section.href) ? 'active' : ''}
              onClick={() => setMobileOpen(false)}
            >
              <Icon name={section.icon} size={16} />
              <span>{section.label}</span>
              {(section.href === '/pro' || section.href === '/ai') && <small>PRO</small>}
            </Link>
          ))}
        </nav>
        <div className="workspace-sidebar-bottom">
          <Link to="/settings" className={location.pathname === '/settings' ? 'active' : ''}>
            <Icon name="shield" size={16} />
            <span>Настройки</span>
          </Link>
          <div className="workspace-account">
            <span>{(user?.username || 'TR').slice(0, 2).toUpperCase()}</span>
            <div>
              <strong>{user?.username || 'Trader'}</strong>
              <small>{subscriptionTier === 'pro' ? 'PRO' : 'Free'} аккаунт</small>
            </div>
            <button type="button" onClick={logout} aria-label="Выйти">
              ↗
            </button>
          </div>
        </div>
      </aside>
      {mobileOpen && (
        <button
          className="workspace-backdrop"
          aria-label="Закрыть меню"
          type="button"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <main className="workspace-main">{children}</main>
    </div>
  );
}
