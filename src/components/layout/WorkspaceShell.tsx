import { ReactNode, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowsLeftRight,
  ChartLineUp,
  GearSix,
  House,
  List,
  Notebook,
  PlugsConnected,
  ShieldCheck,
  SignOut,
  Sparkle,
  Target,
  X,
  type Icon as PhosphorIcon,
} from '@phosphor-icons/react';
import { useAuth } from '@/hooks/useAuth';

interface WorkspaceSettings {
  compact: boolean;
  manualTrades: boolean;
}

interface NavigationItem {
  label: string;
  href: string;
  icon: PhosphorIcon;
  pro?: boolean;
}

const SETTINGS_KEY = 'tradeumdiary_workspace_settings_v1';

const primarySections: NavigationItem[] = [
  { label: 'Обзор', href: '/dashboard', icon: House },
  { label: 'Сделки', href: '/dashboard/trades', icon: ArrowsLeftRight },
  { label: 'Аналитика', href: '/pro', icon: ChartLineUp, pro: true },
  { label: 'Риск', href: '/dashboard/risk', icon: ShieldCheck, pro: true },
  { label: 'Источники', href: '/dashboard/wallets', icon: PlugsConnected },
];

const secondarySections: NavigationItem[] = [
  { label: 'AI-разбор', href: '/ai', icon: Sparkle, pro: true },
  { label: 'Цели', href: '/goals', icon: Target },
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

function isCurrent(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname.startsWith(href);
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
        const active = isCurrent(pathname, section.href);
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

export function WorkspaceShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading, subscriptionTier, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [settings, setSettings] = useState<WorkspaceSettings>(readWorkspaceSettings);

  useEffect(() => {
    const applyWorkspaceSettings = () => {
      const next = readWorkspaceSettings();
      setSettings(next);
      document.documentElement.classList.toggle('workspace-compact', next.compact);
    };

    applyWorkspaceSettings();
    window.addEventListener('tradeumdiary:settings', applyWorkspaceSettings);
    return () => window.removeEventListener('tradeumdiary:settings', applyWorkspaceSettings);
  }, []);

  const navigation = useMemo(() => {
    if (!settings.manualTrades) return primarySections;
    return [
      ...primarySections.slice(0, 2),
      { label: 'Ручная запись', href: '/dashboard/journal', icon: Notebook },
      ...primarySections.slice(2),
    ];
  }, [settings.manualTrades]);

  if (isLoading) {
    return <div className="workspace-loading">Загрузка рабочего пространства…</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  const logout = async () => {
    await signOut();
    navigate('/');
  };

  const closeMobile = () => setMobileOpen(false);

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
            <ChartLineUp size={18} weight="bold" />
          </span>
          <div>
            <strong>TradeumDiary</strong>
            <small>Trading intelligence</small>
          </div>
        </Link>

        <WorkspaceNavigation
          items={navigation}
          pathname={location.pathname}
          onNavigate={closeMobile}
        />

        <div className="workspace-sidebar-secondary">
          <p>Инструменты</p>
          <WorkspaceNavigation
            items={secondarySections}
            pathname={location.pathname}
            onNavigate={closeMobile}
          />
        </div>

        <div className="workspace-sidebar-bottom">
          <Link to="/settings" className={location.pathname === '/settings' ? 'active' : ''}>
            <GearSix size={17} />
            <span>Настройки</span>
          </Link>
          <div className="workspace-account">
            <span>{(user?.username || 'TR').slice(0, 2).toUpperCase()}</span>
            <div>
              <strong>{user?.username || 'Trader'}</strong>
              <small>{subscriptionTier === 'pro' ? 'PRO + AI' : 'Free'} · синхронизация</small>
            </div>
            <button type="button" onClick={logout} aria-label="Выйти">
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

      <main className="workspace-main">{children}</main>
    </div>
  );
}
