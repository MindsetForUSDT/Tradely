import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowsLeftRight,
  ArrowRight,
  ArrowClockwise,
  ChartLineUp,
  GearSix,
  House,
  List,
  MagnifyingGlass,
  PlugsConnected,
  ShieldCheck,
  SignOut,
  SquaresFour,
  Target,
  X,
  type Icon as PhosphorIcon,
} from '@phosphor-icons/react';
import { useAuth } from '@/hooks/useAuth';
import { useWallets } from '@/hooks/useWallets';
import '@/styles/sync-runtime-v5.css';

interface WorkspaceSettings {
  compact: boolean;
  manualTrades: boolean;
}

interface NavigationItem {
  label: string;
  href: string;
  icon: PhosphorIcon;
  pro?: boolean;
  aliases?: string[];
}

const SETTINGS_KEY = 'tradeumdiary_workspace_settings_v1';

const primarySections: NavigationItem[] = [
  { label: 'Обзор', href: '/dashboard', icon: House },
  { label: 'Сделки', href: '/dashboard/trades', icon: ArrowsLeftRight },
  { label: 'Аналитика', href: '/pro', icon: ChartLineUp, pro: true },
  { label: 'Риск', href: '/dashboard/risk', icon: ShieldCheck, pro: true },
  { label: 'Источники', href: '/dashboard/wallets', icon: PlugsConnected },
  { label: 'Прогресс', href: '/goals', icon: Target, aliases: ['/achievements'] },
];

function readWorkspaceSettings(): WorkspaceSettings {
  try {
    const saved = JSON.parse(
      localStorage.getItem(SETTINGS_KEY) || '{}'
    ) as Partial<WorkspaceSettings>;
    return {
      compact: Boolean(saved.compact),
      manualTrades: Boolean(saved.manualTrades),
    };
  } catch {
    return { compact: false, manualTrades: false };
  }
}

function isCurrent(pathname: string, href: string, aliases: string[] = []) {
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname.startsWith(href) || aliases.some((alias) => pathname.startsWith(alias));
}

function WorkspaceNavigation({
  items,
  pathname,
  onNavigate,
}: {
  items: NavigationItem[];
  pathname: string;
  onNavigate: () => void;
}) {
  return (
    <nav aria-label="Разделы рабочего пространства">
      {items.map((section) => {
        const active = isCurrent(pathname, section.href, section.aliases);
        const NavigationIcon = section.icon;
        return (
          <Link
            key={section.href}
            to={section.href}
            className={active ? 'active' : ''}
            onClick={onNavigate}
          >
            <NavigationIcon size={17} weight={active ? 'fill' : 'regular'} />
            <span>{section.label}</span>
            {section.pro ? <small>PRO</small> : null}
          </Link>
        );
      })}
    </nav>
  );
}

function WorkspaceSyncState() {
  const { wallets, isLoading } = useWallets();
  const isProcessing = wallets.some((wallet) =>
    ['pending', 'processing'].includes(wallet.processing_status)
  );
  const hasError = wallets.some((wallet) => wallet.processing_status === 'failed');
  const tone = hasError
    ? 'failed'
    : isProcessing
      ? 'processing'
      : wallets.length
        ? 'ready'
        : 'empty';
  const label = isLoading
    ? 'Проверяем свежесть данных'
    : hasError
      ? 'Последняя синхронизация с ошибкой'
      : isProcessing
        ? 'Синхронизация выполняется'
        : wallets.length
          ? 'Автосинхронизация активна'
          : 'Источник не подключён';

  return (
    <span className={`workspace-sync-state ${tone}`} aria-live="polite">
      {isProcessing ? <ArrowClockwise size={13} className="spin" /> : <i />}
      {label}
    </span>
  );
}

export function WorkspaceShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading, subscriptionTier } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');

  useEffect(() => {
    const applyWorkspaceSettings = () => {
      const next = readWorkspaceSettings();
      document.documentElement.classList.toggle('workspace-compact', next.compact);
    };

    applyWorkspaceSettings();
    window.addEventListener('tradeumdiary:settings', applyWorkspaceSettings);
    return () => window.removeEventListener('tradeumdiary:settings', applyWorkspaceSettings);
  }, []);

  const navigation = primarySections;

  if (isLoading) {
    return <div className="workspace-loading">Загрузка рабочего пространства…</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  const closeMobile = () => setMobileOpen(false);
  const searchTrades = (event: FormEvent) => {
    event.preventDefault();
    const query = globalSearch.trim();
    navigate(query ? `/dashboard/trades?search=${encodeURIComponent(query)}` : '/dashboard/trades');
  };

  return (
    <div className="workspace-shell workspace-shell-v3">
      <header className="workspace-mobile-head">
        <Link to="/dashboard">
          <ChartLineUp size={19} weight="bold" />
          TradeumDiary
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen((value) => !value)}
          aria-expanded={mobileOpen}
          aria-label="Открыть рабочее меню"
        >
          {mobileOpen ? <X size={21} /> : <List size={21} />}
        </button>
      </header>

      <aside className={`workspace-sidebar workspace-sidebar-v3 ${mobileOpen ? 'is-open' : ''}`}>
        <Link className="workspace-brand workspace-brand-v3" to="/dashboard" onClick={closeMobile}>
          <span>
            <SquaresFour size={18} weight="regular" />
          </span>
          <div>
            <strong>TradeumDiary</strong>
            <small>Trading journal</small>
          </div>
        </Link>

        <WorkspaceNavigation
          items={navigation}
          pathname={location.pathname}
          onNavigate={closeMobile}
        />

        <div className="workspace-sidebar-bottom">
          <Link to="/settings" className={location.pathname === '/settings' ? 'active' : ''}>
            <GearSix size={17} />
            <span>Настройки</span>
          </Link>
          <div className="workspace-account">
            <span>{(user?.username || 'TR').slice(0, 2).toUpperCase()}</span>
            <div>
              <strong>{user?.username || 'Trader'}</strong>
              <small>{subscriptionTier === 'pro' ? 'PRO' : 'Free'} · синхронизация</small>
            </div>
            <button type="button" onClick={() => navigate('/logout')} aria-label="Выйти">
              <SignOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {mobileOpen ? (
        <button
          className="workspace-backdrop"
          aria-label="Закрыть меню"
          type="button"
          onClick={closeMobile}
        />
      ) : null}

      <main className="workspace-main">
        <header className="workspace-topbar">
          <form onSubmit={searchTrades}>
            <MagnifyingGlass size={16} />
            <input
              value={globalSearch}
              onChange={(event) => setGlobalSearch(event.target.value)}
              placeholder="Поиск по сделкам, тегам, заметкам…"
              aria-label="Поиск по торговой истории"
            />
            <kbd>⌘ K</kbd>
          </form>
          <WorkspaceSyncState />
          <Link className="workspace-primary-action" to="/dashboard/trades">
            Открыть сделки
            <i aria-hidden="true">
              <ArrowRight size={16} />
            </i>
          </Link>
        </header>
        <div className="workspace-main-view">{children}</div>
      </main>
    </div>
  );
}
