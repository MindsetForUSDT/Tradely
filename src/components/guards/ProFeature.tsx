import { ReactNode, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/ui/Icons';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface ProFeatureProps {
  children: ReactNode;
  fallback?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  blur?: boolean;
}

export function ProFeature({ children, fallback, size = 'md', blur = true }: ProFeatureProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const expiresAt = user?.subscription_expires_at ? new Date(user.subscription_expires_at) : null;
  const isPro = user?.subscription_tier === 'pro' && (!expiresAt || expiresAt > new Date());
  if (isPro) return <>{children}</>;
  if (fallback) return <>{fallback}</>;

  const padding = { sm: 'p-4', md: 'p-6', lg: 'p-8' }[size];
  return (
    <>
      <div className="pro-gate">
        <div className={cn(padding, blur && 'pro-gate-content')}>{children}</div>
        <div className="pro-gate-overlay">
          <div className="pro-gate-icon">
            <Icon name="pro" size={21} />
          </div>
          <p>Trader</p>
          <h3>Расширенная функция</h3>
          <span>Доступна на тарифе за 499 ₽ в месяц.</span>
          <button type="button" onClick={() => setOpen(true)}>
            Открыть доступ
          </button>
        </div>
      </div>
      {open && (
        <div className="pro-modal" role="dialog" aria-modal="true" aria-label="Тариф Trader">
          <button
            className="pro-modal-backdrop"
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Закрыть"
          />
          <section>
            <button
              className="pro-modal-close"
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Закрыть"
            >
              <Icon name="close" size={19} />
            </button>
            <p>Тариф Trader</p>
            <h2>
              Больше контекста.
              <br />
              Меньше слепых зон.
            </h2>
            <span>
              Автоматизируйте импорт, контролируйте риск и анализируйте всю торговую историю.
            </span>
            <ul>
              <li>Безлимитная история сделок</li>
              <li>Риск-менеджер и PRO-метрики</li>
              <li>Экспорт CSV, Excel и PDF</li>
              <li>Подготовка к AI-разбору</li>
            </ul>
            <div>
              <strong>
                499 ₽ <small>/ месяц</small>
              </strong>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  navigate('/subscribe');
                }}
              >
                Выбрать Trader
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
