import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  DownloadSimple,
  GearSix,
  LockKey,
  PlugsConnected,
  ShieldCheck,
  SlidersHorizontal,
  UserCircle,
  Wallet,
} from '@phosphor-icons/react';
import { useAuth } from '@/hooks/useAuth';

const SETTINGS_KEY = 'tradeumdiary_workspace_settings_v1';

interface WorkspacePreferences {
  compact: boolean;
  manualTrades: boolean;
}

const defaults: WorkspacePreferences = {
  compact: false,
  manualTrades: false,
};

function readPreferences(): WorkspacePreferences {
  try {
    const saved = JSON.parse(
      localStorage.getItem(SETTINGS_KEY) || '{}'
    ) as Partial<WorkspacePreferences>;
    return {
      compact: Boolean(saved.compact),
      manualTrades: Boolean(saved.manualTrades),
    };
  } catch {
    return defaults;
  }
}

function Toggle({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <button
      className={`settings-v7-toggle ${checked ? 'is-on' : ''}`}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
    >
      <i />
    </button>
  );
}

export function SettingsWorkspace() {
  const { user, subscriptionTier } = useAuth();
  const [settings, setSettings] = useState(readPreferences);
  const [saved, setSaved] = useState(() => JSON.stringify(readPreferences()));
  const changed = JSON.stringify(settings) !== saved;

  const set = <K extends keyof WorkspacePreferences>(key: K, value: WorkspacePreferences[K]) =>
    setSettings((current) => ({ ...current, [key]: value }));

  const save = () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    setSaved(JSON.stringify(settings));
    window.dispatchEvent(new Event('tradeumdiary:settings'));
    toast.success('Настройки сохранены');
  };

  const exportPreferences = () => {
    const payload = JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        profile: { email: user?.email },
        preferences: settings,
      },
      null,
      2
    );
    const url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'tradeum-settings.json';
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success('Настройки экспортированы');
  };

  const nav = [
    ['profile', 'Профиль', UserCircle],
    ['import', 'Торговля и импорт', PlugsConnected],
    ['risk', 'Риск', ShieldCheck],
    ['interface', 'Интерфейс', SlidersHorizontal],
    ['security', 'Безопасность', LockKey],
    ['plan', 'Тариф и данные', Wallet],
  ] as const;

  return (
    <section className="settings-v7-page">
      <header className="settings-v7-head">
        <div>
          <h1>Настройки</h1>
          <p>Управляйте торговыми данными, риском и поведением рабочего пространства.</p>
        </div>
        <button type="button" onClick={save} disabled={!changed}>
          Сохранить изменения
        </button>
      </header>

      <div className="settings-v7-layout">
        <aside className="settings-v7-index" aria-label="Разделы настроек">
          {nav.map(([id, label, SectionIcon]) => (
            <a key={id} href={`#settings-${id}`}>
              <SectionIcon size={16} />
              {label}
            </a>
          ))}
        </aside>

        <div className="settings-v7-content">
          <section id="settings-profile" className="settings-v7-section">
            <header>
              <span>Профиль</span>
              <small>Данные аккаунта</small>
            </header>
            <div className="settings-v7-profile">
              <div>{(user?.username || 'TR').slice(0, 2).toUpperCase()}</div>
              <p>
                <strong>{user?.username || 'Trader'}</strong>
                <small>{user?.email || 'Email не указан'}</small>
              </p>
              <Link to="/forgot-password">Изменить пароль</Link>
            </div>
          </section>

          <section id="settings-import" className="settings-v7-section">
            <header>
              <span>Торговля и импорт</span>
              <Link to="/dashboard/wallets">Управлять источниками</Link>
            </header>
            <div className="settings-v7-row is-static">
              <span>
                <strong>Автоматический импорт завершённых сделок</strong>
                <small>Всегда активен для подключённых источников.</small>
              </span>
              <em>Всегда включён</em>
            </div>
            <div className="settings-v7-row">
              <span>
                <strong>Ручное добавление сделок</strong>
                <small>Показывать действие ручного ввода в разделе «Сделки».</small>
              </span>
              <Toggle
                checked={settings.manualTrades}
                label="Ручное добавление сделок"
                onChange={() => set('manualTrades', !settings.manualTrades)}
              />
            </div>
          </section>

          <section id="settings-risk" className="settings-v7-section">
            <header>
              <span>Риск</span>
              <Link to="/dashboard/risk">Открыть риск-менеджер</Link>
            </header>
            <div className="settings-v7-row is-static">
              <span>
                <strong>Единые лимиты риска</strong>
                <small>
                  Лимит дневных потерь и параметры позиции настраиваются в действующем
                  риск-менеджере.
                </small>
              </span>
              <Link className="settings-v7-inline-action" to="/dashboard/risk">
                Настроить
              </Link>
            </div>
          </section>

          <section id="settings-interface" className="settings-v7-section">
            <header>
              <span>Интерфейс</span>
              <GearSix size={16} />
            </header>
            <div className="settings-v7-row">
              <span>
                <strong>Компактный режим</strong>
                <small>Больше строк в таблицах и меньше вертикальных отступов.</small>
              </span>
              <Toggle
                checked={settings.compact}
                label="Компактный режим"
                onChange={() => set('compact', !settings.compact)}
              />
            </div>
          </section>

          <section id="settings-security" className="settings-v7-section">
            <header>
              <span>Безопасность</span>
              <small>Текущая сессия</small>
            </header>
            <div className="settings-v7-session">
              <span>
                <i />
                Этот браузер
              </span>
              <small>Сессия активна · доступ к торговым средствам отсутствует</small>
              <Link to="/logout">Завершить сессию</Link>
            </div>
            <div className="settings-v7-row">
              <span>
                <strong>Пароль аккаунта</strong>
                <small>Сброс выполняется по одноразовой ссылке на email.</small>
              </span>
              <Link className="settings-v7-inline-action" to="/forgot-password">
                Изменить
              </Link>
            </div>
          </section>

          <section id="settings-plan" className="settings-v7-section">
            <header>
              <span>Тариф и данные</span>
              <small>{subscriptionTier === 'pro' ? 'PRO активен' : 'Текущий тариф Free'}</small>
            </header>
            <div className="settings-v7-plan">
              <div>
                <strong>{subscriptionTier === 'pro' ? 'PRO' : 'Free'}</strong>
                <small>
                  {subscriptionTier === 'pro'
                    ? 'Расширенная аналитика активна'
                    : 'Базовый дневник без ограничений по времени'}
                </small>
              </div>
              <b>{subscriptionTier === 'pro' ? '499 ₽ / месяц' : '0 ₽'}</b>
              <Link to="/subscribe">Управлять тарифом</Link>
            </div>
            <div className="settings-v7-row">
              <span>
                <strong>Экспорт настроек</strong>
                <small>Скачать локальные предпочтения этого рабочего пространства в JSON.</small>
              </span>
              <button
                className="settings-v7-inline-action"
                type="button"
                onClick={exportPreferences}
              >
                <DownloadSimple size={15} /> Скачать
              </button>
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
