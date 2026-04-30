import { useNavigate, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PlanCard } from '@/components/subscription/PlanCard';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';

export function Subscribe() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (user?.subscription_tier === 'pro') return <Navigate to="/dashboard" replace />;

  const trialEnd = user?.subscription_expires_at ? new Date(user.subscription_expires_at) : null;
  const trialActive = trialEnd && trialEnd > new Date();
  const daysLeft = trialActive ? Math.ceil((trialEnd!.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
            Выберите свой уровень<br />
            <span className="text-gradient">трейдинг-аналитики</span>
          </h1>
          <p className="text-text-secondary max-w-xl mx-auto">Начните с бесплатного триала на 7 дней или получите полный доступ с PRO.</p>

          {trialActive && (
            <div className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-accent-green/10 border border-accent-green/20">
              <span className="w-2 h-2 rounded-full bg-accent-green animate-glow-pulse" />
              <span className="text-sm text-accent-green">
                У вас активен триал. Осталось <strong>{daysLeft} {daysLeft === 1 ? 'день' : daysLeft < 5 ? 'дня' : 'дней'}</strong>
              </span>
            </div>
          )}
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          <PlanCard
            title="FREE TRIAL"
            price="0"
            period="7 дней"
            description="Полный доступ на пробный период"
            features={[
              { text: 'Все функции PRO на 7 дней', included: true },
              { text: 'Неограниченное число кошельков', included: true },
              { text: 'Полная история сделок', included: true },
              { text: 'Расчёт P&L', included: true },
            ]}
            isPopular={false}
            action={
              trialActive ? (
                <Button variant="outline" size="lg" className="w-full" onClick={() => navigate('/dashboard')}>
                  Перейти в дашборд
                </Button>
              ) : (
                <Button variant="outline" size="lg" className="w-full" disabled>
                  Триал истёк
                </Button>
              )
            }
          />
          <PlanCard
            title="PRO"
            price="500"
            period="₽ / месяц"
            description="Полный доступ для профессиональных трейдеров"
            features={[
              { text: 'Все функции FREE TRIAL', included: true },
              { text: 'Без ограничений по времени', included: true },
              { text: 'Приоритетная поддержка 24/7', included: true },
            ]}
            isPopular={true}
            action={
              <Button variant="primary" size="lg" className="w-full" onClick={() => navigate(user ? '/payment' : '/')}>
                {user ? 'Оформить PRO' : 'Начать бесплатно'}
              </Button>
            }
          />
        </div>
      </div>
    </div>
  );
}