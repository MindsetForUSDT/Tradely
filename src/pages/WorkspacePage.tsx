import { Link, Navigate } from 'react-router-dom';
import { Icon } from '@/components/ui/Icons';
import { useAuth } from '@/hooks/useAuth';

type WorkspaceKind = 'ai' | 'goals' | 'achievements' | 'settings';

const content: Record<
  WorkspaceKind,
  { eyebrow: string; title: string; description: string; icon: 'info' | 'risk' | 'pro' | 'shield' }
> = {
  ai: {
    eyebrow: 'PRO + AI',
    title: 'AI-разбор торговых решений',
    description: 'Находите повторяющиеся ошибки во входах, выходах и управлении риском.',
    icon: 'info',
  },
  goals: {
    eyebrow: 'Дисциплина',
    title: 'Цели и прогресс',
    description: 'Задайте измеримые ограничения и следите за выполнением торгового плана.',
    icon: 'risk',
  },
  achievements: {
    eyebrow: 'Система',
    title: 'Достижения',
    description:
      'Отмечайте не только прибыль, но и качество решений, последовательность и контроль риска.',
    icon: 'pro',
  },
  settings: {
    eyebrow: 'Рабочее пространство',
    title: 'Настройки',
    description: 'Управляйте профилем, тарифом, источниками данных и параметрами безопасности.',
    icon: 'shield',
  },
};

export function WorkspacePage({ kind }: { kind: WorkspaceKind }) {
  const { isAuthenticated, isLoading, subscriptionTier } = useAuth();
  if (isLoading) return <div className="workspace-loading">Загрузка рабочего пространства…</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const page = content[kind];
  const locked = kind === 'ai' && subscriptionTier !== 'pro';

  return (
    <section className="workspace-page">
      <div className="workspace-heading">
        <p>{page.eyebrow}</p>
        <h1>{page.title}</h1>
        <span>{page.description}</span>
      </div>
      <div className="workspace-state">
        <div className="workspace-icon">
          <Icon name={page.icon} size={28} />
        </div>
        {locked ? (
          <>
            <h2>Доступно на тарифе PRO + AI</h2>
            <p>
              Подключите расширенный анализ, чтобы получать рекомендации на основе вашей торговой
              истории.
            </p>
            <Link to="/subscribe">Посмотреть тарифы</Link>
          </>
        ) : (
          <>
            <h2>Сначала подключите источник данных</h2>
            <p>
              Мы покажем реальные показатели после импорта сделок. Демо-значения не подменяют вашу
              аналитику.
            </p>
            <Link to="/dashboard/wallets">Подключить источник</Link>
          </>
        )}
      </div>
    </section>
  );
}
