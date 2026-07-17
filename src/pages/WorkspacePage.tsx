import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Icon } from '@/components/ui/Icons';
import { useAuth } from '@/hooks/useAuth';

type WorkspaceKind = 'ai' | 'goals' | 'achievements' | 'settings';

interface Goal {
  id: string;
  title: string;
  target: string;
  progress: number;
}

const GOALS_KEY = 'tradeumdiary_goals_v1';
const SETTINGS_KEY = 'tradeumdiary_workspace_settings_v1';

function PageHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="workspace-heading">
      <p>{eyebrow}</p>
      <h1>{title}</h1>
      <span>{description}</span>
    </div>
  );
}

function AiWorkspace() {
  const { subscriptionTier } = useAuth();
  const locked = subscriptionTier !== 'pro';

  return (
    <section className="workspace-page">
      <PageHeading
        eyebrow="PRO + AI"
        title="AI-разбор торговых решений"
        description="Находите повторяющиеся ошибки во входах, выходах и управлении риском."
      />
      <div className="workspace-state workspace-state-split">
        <div className="workspace-icon">
          <Icon name="info" size={28} />
        </div>
        {locked ? (
          <>
            <p className="workspace-state-label">Функция тарифа PRO + AI</p>
            <h2>Разбирайте не только результат, но и решение</h2>
            <p>
              AI сопоставляет заметки, риск, сетап и результат, чтобы находить повторяющиеся
              поведенческие паттерны.
            </p>
            <div className="workspace-feature-list">
              <span>Серии импульсивных входов</span>
              <span>Изменение риска после побед</span>
              <span>Слабые торговые сетапы</span>
            </div>
            <Link to="/subscribe">Сравнить тарифы</Link>
          </>
        ) : (
          <>
            <p className="workspace-state-label">Шаг 1</p>
            <h2>Добавьте сделки и контекст</h2>
            <p>Первый разбор появится, когда истории будет достаточно для обоснованного вывода.</p>
            <Link to="/dashboard/wallets">Подключить источник</Link>
          </>
        )}
      </div>
    </section>
  );
}

function GoalsWorkspace() {
  const [goals, setGoals] = useState<Goal[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(GOALS_KEY) || '[]') as Goal[];
    } catch {
      return [];
    }
  });
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState('');

  useEffect(() => localStorage.setItem(GOALS_KEY, JSON.stringify(goals)), [goals]);

  const addGoal = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !target.trim()) return;
    setGoals((current) => [
      ...current,
      { id: crypto.randomUUID(), title: title.trim(), target: target.trim(), progress: 0 },
    ]);
    setTitle('');
    setTarget('');
    toast.success('Цель добавлена');
  };

  const removeGoal = (id: string) =>
    setGoals((current) => current.filter((goal) => goal.id !== id));

  return (
    <section className="workspace-page">
      <PageHeading
        eyebrow="Дисциплина"
        title="Цели и прогресс"
        description="Планируйте процесс до того, как рынок начнёт влиять на решения."
      />
      <div className="workspace-tool-grid">
        <form className="workspace-goal-form" onSubmit={addGoal}>
          <span>Новая цель</span>
          <h2>Что вы хотите улучшить?</h2>
          <label>
            Название
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Например: соблюдать дневной лимит"
            />
          </label>
          <label>
            Критерий
            <input
              value={target}
              onChange={(event) => setTarget(event.target.value)}
              placeholder="Например: 20 торговых дней"
            />
          </label>
          <button type="submit" disabled={!title.trim() || !target.trim()}>
            Добавить цель
          </button>
        </form>
        <div className="workspace-goal-list">
          <div className="workspace-list-head">
            <span>Активные цели</span>
            <small>{goals.length}</small>
          </div>
          {goals.length ? (
            goals.map((goal) => (
              <article key={goal.id}>
                <div>
                  <strong>{goal.title}</strong>
                  <span>{goal.target}</span>
                </div>
                <div className="workspace-goal-progress">
                  <i style={{ width: `${goal.progress}%` }} />
                </div>
                <button
                  type="button"
                  onClick={() => removeGoal(goal.id)}
                  aria-label={`Удалить цель ${goal.title}`}
                >
                  ×
                </button>
              </article>
            ))
          ) : (
            <div className="workspace-list-empty">
              <Icon name="risk" size={24} />
              <strong>Пока нет активных целей</strong>
              <span>Создайте первую — источник данных для этого не требуется.</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function AchievementsWorkspace() {
  const achievements = [
    { title: 'Начало системы', copy: 'Аккаунт и рабочее пространство созданы.', unlocked: true },
    { title: 'Первые данные', copy: 'Импортируйте первую торговую историю.', unlocked: false },
    { title: 'Неделя дисциплины', copy: 'Соблюдайте риск-правила 7 дней подряд.', unlocked: false },
    { title: 'Осознанная серия', copy: 'Добавьте контекст к 20 сделкам.', unlocked: false },
  ];
  return (
    <section className="workspace-page">
      <PageHeading
        eyebrow="Система"
        title="Достижения"
        description="Прогресс строится вокруг качества процесса, а не случайной прибыли."
      />
      <div className="workspace-achievements">
        {achievements.map((item, index) => (
          <article className={item.unlocked ? 'unlocked' : ''} key={item.title}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <div className="workspace-achievement-icon">
              <Icon name={item.unlocked ? 'shield' : 'pro'} size={22} />
            </div>
            <div>
              <strong>{item.title}</strong>
              <p>{item.copy}</p>
            </div>
            <small>{item.unlocked ? 'Получено' : 'Заблокировано'}</small>
          </article>
        ))}
      </div>
    </section>
  );
}

function SettingsWorkspace() {
  const { user, subscriptionTier } = useAuth();
  const [settings, setSettings] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem(SETTINGS_KEY) ||
          '{"riskAlerts":true,"weeklyDigest":true,"compact":false,"manualTrades":false}'
      ) as {
        riskAlerts: boolean;
        weeklyDigest: boolean;
        compact: boolean;
        manualTrades: boolean;
      };
    } catch {
      return { riskAlerts: true, weeklyDigest: true, compact: false, manualTrades: false };
    }
  });
  const changed = useMemo(
    () => JSON.stringify(settings) !== localStorage.getItem(SETTINGS_KEY),
    [settings]
  );
  const save = () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    window.dispatchEvent(new Event('tradeumdiary:settings'));
    toast.success('Настройки сохранены');
  };
  const toggle = (key: keyof typeof settings) =>
    setSettings((current) => ({ ...current, [key]: !current[key] }));

  return (
    <section className="workspace-page">
      <PageHeading
        eyebrow="Рабочее пространство"
        title="Настройки"
        description="Профиль, автоматизация импорта и поведение интерфейса."
      />
      <div className="workspace-settings-grid">
        <section>
          <span>Профиль</span>
          <div className="workspace-profile-row">
            <div>{(user?.username || 'TR').slice(0, 2).toUpperCase()}</div>
            <p>
              <strong>{user?.username || 'Trader'}</strong>
              <small>{user?.email || 'Email не указан'}</small>
            </p>
          </div>
        </section>
        <section>
          <span>Тариф</span>
          <div className="workspace-plan-row">
            <p>
              <strong>{subscriptionTier === 'pro' ? 'PRO + AI' : 'Free'}</strong>
              <small>
                {subscriptionTier === 'pro'
                  ? 'Расширенная аналитика активна'
                  : 'Базовый торговый дневник'}
              </small>
            </p>
            <Link to="/subscribe">Управлять</Link>
          </div>
        </section>
        <section className="workspace-settings-wide">
          <span>Автоматизация и интерфейс</span>
          <div className="workspace-setting-static">
            <span>
              <strong>Автоматический импорт сделок</strong>
              <small>
                Всегда включён для подключённых источников. Новые сделки синхронизируются без
                ручного ввода.
              </small>
            </span>
            <em>Всегда включён</em>
          </div>
          {[
            [
              'riskAlerts',
              'Предупреждения о риске',
              'Сообщать о приближении к установленному лимиту.',
            ],
            [
              'weeklyDigest',
              'Еженедельный отчёт',
              'Краткий итог по дисциплине и торговым паттернам.',
            ],
            ['compact', 'Компактный режим', 'Уменьшить отступы в таблицах и аналитике.'],
            [
              'manualTrades',
              'Ручное добавление сделок',
              'Показывать действие «Добавить вручную» внутри раздела «Сделки».',
            ],
          ].map(([key, title, copy]) => (
            <button type="button" onClick={() => toggle(key as keyof typeof settings)} key={key}>
              <span>
                <strong>{title}</strong>
                <small>{copy}</small>
              </span>
              <i className={settings[key as keyof typeof settings] ? 'on' : ''} />
            </button>
          ))}
          <div className="workspace-settings-actions">
            <small>Настройки сохраняются в этом браузере.</small>
            <button type="button" onClick={save} disabled={!changed}>
              Сохранить изменения
            </button>
          </div>
        </section>
      </div>
    </section>
  );
}

export function WorkspacePage({ kind }: { kind: WorkspaceKind }) {
  if (kind === 'ai') return <AiWorkspace />;
  if (kind === 'goals') return <GoalsWorkspace />;
  if (kind === 'achievements') return <AchievementsWorkspace />;
  return <SettingsWorkspace />;
}
