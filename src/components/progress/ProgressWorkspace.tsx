import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Archive,
  ArrowRight,
  Check,
  CheckCircle,
  ClockCounterClockwise,
  Flag,
  Minus,
  Plus,
  Target,
  TrendUp,
} from '@phosphor-icons/react';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import { useTradesOptimized } from '@/hooks/useTradesOptimized';
import { useWallets } from '@/hooks/useWallets';
import { api } from '@/lib/api';
import {
  buildProgressAchievements,
  clampGoalProgress,
  type GoalRecord,
  summarizeWeek,
} from '@/lib/progress';
import { formatSignedUSD } from '@/lib/tradeAnalytics';

type ProgressTab = 'goals' | 'review' | 'achievements';

const goalTemplates = [
  {
    title: 'Соблюдать дневной лимит',
    target: 'Не превышать установленный лимит убытка 20 торговых дней',
    caption: 'Контроль риска',
  },
  {
    title: 'Не увеличивать риск после убытка',
    target: 'Сохранить базовый риск в следующих 15 сделках после убыточной',
    caption: 'Стабильность решений',
  },
  {
    title: 'Торговать один проверяемый сетап',
    target: 'Собрать выборку из 30 сделок по одному сетапу',
    caption: 'Качество выборки',
  },
] as const;

const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
  weekday: 'short',
  day: '2-digit',
  month: 'short',
});

function getTab(pathname: string): ProgressTab {
  if (pathname.includes('achievements')) return 'achievements';
  if (pathname.includes('review')) return 'review';
  return 'goals';
}

function ProgressHeader({ tab }: { tab: ProgressTab }) {
  return (
    <header className="progress-head">
      <div>
        <h1>Прогресс</h1>
        <p>Превращайте наблюдения из журнала в проверяемые правила и повторяемый процесс.</p>
      </div>
      <nav aria-label="Разделы прогресса">
        <Link className={tab === 'goals' ? 'active' : ''} to="/goals">
          Цели
        </Link>
        <Link className={tab === 'review' ? 'active' : ''} to="/goals/review">
          Обзор недели
        </Link>
        <Link className={tab === 'achievements' ? 'active' : ''} to="/achievements">
          Достижения
        </Link>
      </nav>
    </header>
  );
}

function GoalComposer({
  onCreate,
}: {
  onCreate: (title: string, target: string) => Promise<void>;
}) {
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !target.trim()) return;
    setSaving(true);
    try {
      await onCreate(title.trim(), target.trim());
      setTitle('');
      setTarget('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="progress-goal-composer" onSubmit={submit}>
      <div className="progress-section-title">
        <span>
          <Target size={18} />
        </span>
        <div>
          <h2>Создать цель</h2>
          <p>Критерий должен однозначно отвечать, выполнено правило или нет.</p>
        </div>
      </div>

      <div className="progress-templates">
        <small>Шаблоны процесса</small>
        {goalTemplates.map((template) => (
          <button
            type="button"
            key={template.title}
            onClick={() => {
              setTitle(template.title);
              setTarget(template.target);
            }}
          >
            <span>
              <strong>{template.title}</strong>
              <small>{template.caption}</small>
            </span>
            <ArrowRight size={15} />
          </button>
        ))}
      </div>

      <label>
        Название
        <input
          value={title}
          maxLength={120}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Например: соблюдать дневной лимит"
        />
      </label>
      <label>
        Измеримый критерий
        <textarea
          value={target}
          maxLength={240}
          onChange={(event) => setTarget(event.target.value)}
          placeholder="Например: 20 торговых дней без превышения"
          rows={3}
        />
        <small>{target.length}/240</small>
      </label>
      <button
        className="progress-primary-button"
        type="submit"
        disabled={saving || !title.trim() || !target.trim()}
      >
        {saving ? 'Сохраняем…' : 'Добавить цель'}
      </button>
    </form>
  );
}

function GoalRow({
  goal,
  busy,
  onUpdate,
}: {
  goal: GoalRecord;
  busy: boolean;
  onUpdate: (goal: GoalRecord, updates: Partial<GoalRecord>) => Promise<void>;
}) {
  const completed = goal.status === 'completed';
  const progress = clampGoalProgress(goal.progress);

  return (
    <article className={`progress-goal-row ${completed ? 'completed' : ''}`}>
      <div className="progress-goal-copy">
        <span>{completed ? <CheckCircle size={20} weight="fill" /> : <Flag size={20} />}</span>
        <div>
          <strong>{goal.title}</strong>
          <p>{goal.target}</p>
        </div>
      </div>

      <div className="progress-goal-meter">
        <div>
          <span>Прогресс</span>
          <output>{progress}%</output>
        </div>
        <i>
          <b style={{ width: `${progress}%` }} />
        </i>
      </div>

      <div className="progress-goal-actions">
        {completed ? (
          <span className="progress-completed-label">
            <Check size={15} /> Завершено
          </span>
        ) : (
          <>
            <button
              type="button"
              disabled={busy || progress === 0}
              onClick={() => void onUpdate(goal, { progress: clampGoalProgress(progress - 10) })}
              aria-label={`Уменьшить прогресс цели ${goal.title}`}
            >
              <Minus size={15} />
            </button>
            <button
              type="button"
              disabled={busy || progress === 100}
              onClick={() => void onUpdate(goal, { progress: clampGoalProgress(progress + 10) })}
              aria-label={`Увеличить прогресс цели ${goal.title}`}
            >
              <Plus size={15} />
            </button>
            <button
              className="progress-complete-button"
              type="button"
              disabled={busy}
              onClick={() => void onUpdate(goal, { progress: 100, status: 'completed' })}
            >
              Завершить
            </button>
          </>
        )}
        <button
          className="progress-archive-button"
          type="button"
          disabled={busy}
          onClick={() => void onUpdate(goal, { status: 'archived' })}
          aria-label={`Архивировать цель ${goal.title}`}
        >
          <Archive size={16} />
        </button>
      </div>
    </article>
  );
}

function GoalsView({
  goals,
  loading,
  onCreate,
  onUpdate,
  busyGoals,
}: {
  goals: GoalRecord[];
  loading: boolean;
  onCreate: (title: string, target: string) => Promise<void>;
  onUpdate: (goal: GoalRecord, updates: Partial<GoalRecord>) => Promise<void>;
  busyGoals: Set<string>;
}) {
  const activeGoals = goals.filter((goal) => goal.status === 'active');
  const completedGoals = goals.filter((goal) => goal.status === 'completed');

  return (
    <div className="progress-goals-layout">
      <GoalComposer onCreate={onCreate} />
      <section className="progress-goal-list" aria-labelledby="active-goals-heading">
        <div className="progress-list-heading">
          <div>
            <h2 id="active-goals-heading">Активные цели</h2>
            <p>Обновляйте прогресс только после фактической проверки критерия.</p>
          </div>
          <span>{activeGoals.length}</span>
        </div>

        {loading ? (
          <div className="progress-empty-state">
            <ClockCounterClockwise size={28} />
            <strong>Загружаем цели…</strong>
          </div>
        ) : activeGoals.length ? (
          <div className="progress-goal-rows">
            {activeGoals.map((goal) => (
              <GoalRow
                key={goal.id}
                goal={goal}
                busy={busyGoals.has(goal.id)}
                onUpdate={onUpdate}
              />
            ))}
          </div>
        ) : (
          <div className="progress-empty-state">
            <Target size={32} />
            <strong>Нет активных целей</strong>
            <p>Выберите шаблон или сформулируйте собственное измеримое правило.</p>
          </div>
        )}

        {completedGoals.length ? (
          <div className="progress-completed-goals">
            <header>
              <h3>Завершённые</h3>
              <span>{completedGoals.length}</span>
            </header>
            {completedGoals.map((goal) => (
              <GoalRow
                key={goal.id}
                goal={goal}
                busy={busyGoals.has(goal.id)}
                onUpdate={onUpdate}
              />
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}

function WeeklyReviewView() {
  const { trades, isLoading, error } = useTradesOptimized({ limit: 5000, daysAgo: 7 });
  const summary = useMemo(() => summarizeWeek(trades), [trades]);

  if (isLoading) {
    return <div className="progress-full-state">Собираем фактические данные за 7 дней…</div>;
  }

  if (error) {
    return (
      <div className="progress-full-state error">
        <strong>Не удалось сформировать обзор</strong>
        <p>{error}</p>
      </div>
    );
  }

  if (!summary.trades) {
    return (
      <div className="progress-review-empty">
        <TrendUp size={34} />
        <h2>За последние 7 дней нет завершённых сделок</h2>
        <p>После синхронизации здесь появится обзор только по вашим реальным данным.</p>
        <Link to="/dashboard/wallets">Проверить источники</Link>
      </div>
    );
  }

  return (
    <div className="progress-review">
      <section className="progress-review-summary">
        <div>
          <span>Чистый результат</span>
          <strong>{formatSignedUSD(summary.netPnl)}</strong>
          <small>После комиссий</small>
        </div>
        <div>
          <span>Завершённые сделки</span>
          <strong>{summary.trades}</strong>
          <small>
            {summary.wins} прибыльных · {summary.losses} убыточных
          </small>
        </div>
        <div>
          <span>Win rate</span>
          <strong>{summary.winRate === null ? '—' : `${summary.winRate.toFixed(1)}%`}</strong>
          <small>Только сделки с ненулевым результатом</small>
        </div>
        <div>
          <span>Комиссии</span>
          <strong>{formatSignedUSD(-summary.fees)}</strong>
          <small>Фактические торговые комиссии</small>
        </div>
      </section>

      <div className="progress-review-grid">
        <section className="progress-day-table">
          <header>
            <div>
              <h2>Дни недели</h2>
              <p>
                {summary.activeDays} торговых дней · {summary.positiveDays} с положительным итогом
              </p>
            </div>
          </header>
          <div className="progress-day-table-head">
            <span>Дата</span>
            <span>Сделки</span>
            <span>Комиссии</span>
            <span>Чистый итог</span>
          </div>
          {summary.days.map((day) => (
            <div className="progress-day-row" key={day.date}>
              <strong>{dateFormatter.format(new Date(`${day.date}T12:00:00`))}</strong>
              <span>{day.trades}</span>
              <span>{formatSignedUSD(-day.fees)}</span>
              <span>{formatSignedUSD(day.netPnl)}</span>
            </div>
          ))}
        </section>

        <aside className="progress-review-note">
          <h2>Что проверить вручную</h2>
          <p>
            Tradeum не присваивает сделкам дисциплину без подтверждённого контекста. Сопоставьте
            результат недели с активными целями и заметками в журнале.
          </p>
          <Link to="/dashboard/trades">
            Открыть сделки <ArrowRight size={15} />
          </Link>
          <Link to="/goals">
            Обновить цели <ArrowRight size={15} />
          </Link>
        </aside>
      </div>
    </div>
  );
}

function AchievementsView({ goals }: { goals: GoalRecord[] }) {
  const { user } = useAuth();
  const { wallets, isLoading: walletsLoading } = useWallets();
  const { totalCount, isLoading: tradesLoading } = useTradesOptimized({ limit: 1 });
  const completedGoalCount = goals.filter((goal) => goal.status === 'completed').length;
  const achievements = buildProgressAchievements({
    accountCreated: Boolean(user?.created_at || user?.id),
    walletCount: wallets.length,
    tradeCount: totalCount,
    completedGoalCount,
  });
  const unlocked = achievements.filter((achievement) => achievement.unlocked).length;

  if (walletsLoading || tradesLoading) {
    return <div className="progress-full-state">Проверяем подтверждённые этапы…</div>;
  }

  return (
    <section className="progress-achievements">
      <header>
        <div>
          <h2>Этапы системы</h2>
          <p>
            Каждый пункт открывается только по данным аккаунта — без условных наград за прибыль.
          </p>
        </div>
        <strong>
          {unlocked} / {achievements.length}
        </strong>
      </header>
      <div className="progress-achievement-list">
        {achievements.map((achievement, index) => {
          const percentage = (achievement.progress / achievement.target) * 100;
          return (
            <article className={achievement.unlocked ? 'unlocked' : ''} key={achievement.id}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <div className="progress-achievement-icon">
                {achievement.unlocked ? (
                  <CheckCircle size={22} weight="fill" />
                ) : (
                  <Target size={22} />
                )}
              </div>
              <div className="progress-achievement-copy">
                <strong>{achievement.title}</strong>
                <p>{achievement.description}</p>
                <i>
                  <b style={{ width: `${percentage}%` }} />
                </i>
              </div>
              <small>{achievement.progressLabel}</small>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function ProgressWorkspace() {
  const location = useLocation();
  const tab = getTab(location.pathname);
  const [goals, setGoals] = useState<GoalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyGoals, setBusyGoals] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    let active = true;
    api
      .get<GoalRecord[]>('/goals')
      .then((items) => {
        if (active) setGoals(items);
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : 'Не удалось загрузить цели');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const createGoal = async (title: string, target: string) => {
    try {
      const goal = await api.post<GoalRecord>('/goals', { title, target });
      setGoals((current) => [goal, ...current]);
      toast.success('Цель добавлена');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось добавить цель');
      throw error;
    }
  };

  const updateGoal = async (goal: GoalRecord, updates: Partial<GoalRecord>) => {
    setBusyGoals((current) => new Set(current).add(goal.id));
    try {
      await api.patch(`/goals/${goal.id}`, updates);
      setGoals((current) =>
        updates.status === 'archived'
          ? current.filter((item) => item.id !== goal.id)
          : current.map((item) => (item.id === goal.id ? { ...item, ...updates } : item))
      );
      if (updates.status === 'completed') toast.success('Цель завершена');
      if (updates.status === 'archived') toast.success('Цель перемещена в архив');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось обновить цель');
    } finally {
      setBusyGoals((current) => {
        const next = new Set(current);
        next.delete(goal.id);
        return next;
      });
    }
  };

  return (
    <section className="progress-workspace">
      <ProgressHeader tab={tab} />
      {tab === 'goals' ? (
        <GoalsView
          goals={goals}
          loading={loading}
          onCreate={createGoal}
          onUpdate={updateGoal}
          busyGoals={busyGoals}
        />
      ) : tab === 'review' ? (
        <WeeklyReviewView />
      ) : (
        <AchievementsView goals={goals} />
      )}
    </section>
  );
}
