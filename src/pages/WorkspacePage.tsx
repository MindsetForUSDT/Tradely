import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Icon } from '@/components/ui/Icons';
import { SettingsWorkspace } from '@/components/settings/SettingsWorkspace';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';

type WorkspaceKind = 'ai' | 'goals' | 'achievements' | 'settings';

interface Goal {
  id: string;
  title: string;
  target: string;
  progress: number;
}

const goalTemplates = [
  {
    title: 'Соблюдать дневной лимит',
    target: '20 торговых дней без превышения',
    caption: 'Контроль риска',
  },
  {
    title: 'Повысить win rate до 50%',
    target: 'Минимум 30 сделок по одному сетапу',
    caption: 'Качество входов',
  },
  {
    title: 'Снизить долю комиссий',
    target: 'Комиссии ниже 12% валового P&L',
    caption: 'Эффективность',
  },
];

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
      {locked ? (
        <div className="workspace-ai-showcase">
          <div className="workspace-ai-preview" aria-hidden="true">
            <header>
              <span>Разбор недели</span>
              <strong>3 паттерна найдены</strong>
            </header>
            <article>
              <small>Повторяющаяся ошибка</small>
              <strong>Увеличение риска после прибыльной сделки</strong>
              <span>7 случаев · влияние на результат −$84.20</span>
            </article>
            <article>
              <small>Сильная сторона</small>
              <strong>Выход по плану снижает средний убыток</strong>
              <span>Соблюдено в 82% размеченных сделок</span>
            </article>
            <article>
              <small>Следующий эксперимент</small>
              <strong>Зафиксировать риск до открытия позиции</strong>
              <span>Проверить на следующих 10 сделках</span>
            </article>
          </div>
          <div className="workspace-ai-unlock">
            <span className="workspace-icon">
              <Icon name="info" size={24} />
            </span>
            <p className="workspace-state-label">Предварительный анализ готов</p>
            <h2>Разбирайте не только результат, но и решение</h2>
            <p>
              AI сопоставляет заметки, риск, сетап и результат, чтобы находить повторяющиеся
              поведенческие паттерны.
            </p>
            <Link to="/subscribe">Разблокировать AI-разбор</Link>
            <small>499 ₽ в месяц · журнал остаётся доступен бесплатно</small>
          </div>
        </div>
      ) : (
        <div className="workspace-state workspace-state-split">
          <div className="workspace-icon">
            <Icon name="info" size={28} />
          </div>
          <>
            <p className="workspace-state-label">Шаг 1</p>
            <h2>Добавьте сделки и контекст</h2>
            <p>Первый разбор появится, когда истории будет достаточно для обоснованного вывода.</p>
            <Link to="/dashboard/wallets">Подключить источник</Link>
          </>
        </div>
      )}
    </section>
  );
}

function GoalsWorkspace() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState('');
  const [creatingTemplate, setCreatingTemplate] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api
      .get<Goal[]>('/goals')
      .then((items) => {
        if (active) setGoals(items);
      })
      .catch((error) =>
        toast.error(error instanceof Error ? error.message : 'Не удалось загрузить цели')
      )
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const createGoal = async (goalTitle: string, goalTarget: string) => {
    try {
      const goal = await api.post<Goal>('/goals', {
        title: goalTitle.trim(),
        target: goalTarget.trim(),
      });
      setGoals((current) => [goal, ...current]);
      setTitle('');
      setTarget('');
      toast.success('Цель добавлена');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось добавить цель');
    }
  };

  const addGoal = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !target.trim()) return;
    await createGoal(title, target);
  };

  const addGoalTemplate = async (template: (typeof goalTemplates)[number]) => {
    setCreatingTemplate(template.title);
    await createGoal(template.title, template.target);
    setCreatingTemplate(null);
  };

  const removeGoal = async (id: string) => {
    try {
      await api.delete(`/goals/${id}`);
      setGoals((current) => current.filter((goal) => goal.id !== id));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось удалить цель');
    }
  };

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
          <div className="workspace-goal-templates">
            <small>Добавить в один клик</small>
            {goalTemplates.map((template) => (
              <button
                type="button"
                key={template.title}
                onClick={() => void addGoalTemplate(template)}
                disabled={creatingTemplate !== null}
              >
                <span>
                  <strong>{template.title}</strong>
                  <small>{template.caption}</small>
                </span>
                <b>{creatingTemplate === template.title ? '…' : '+'}</b>
              </button>
            ))}
          </div>
          <div className="workspace-goal-divider">
            <span>или своя цель</span>
          </div>
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
          {loading ? (
            <div className="workspace-list-empty">
              <strong>Загружаем цели…</strong>
            </div>
          ) : goals.length ? (
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
              <span className="workspace-goal-empty-icon">
                <Icon name="risk" size={27} />
              </span>
              <small>Здесь появится ваш маршрут улучшения</small>
              <strong>Пока нет активных целей</strong>
              <span>
                Начните с готового шаблона слева или сформулируйте собственное проверяемое правило.
              </span>
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

export function WorkspacePage({ kind }: { kind: WorkspaceKind }) {
  if (kind === 'ai') return <AiWorkspace />;
  if (kind === 'goals') return <GoalsWorkspace />;
  if (kind === 'achievements') return <AchievementsWorkspace />;
  return <SettingsWorkspace />;
}
