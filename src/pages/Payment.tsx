import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icons';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';

export function Payment() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  // Блокируем доступ к странице оплаты для новых пользователей
  if (user?.subscription_tier === 'free' || !user) {
    return <Navigate to="/subscribe" replace />;
  }

  const handlePayment = async () => {
    toast.error('PRO подписка находится в разработке. Доступна в ближайшее время!');
    return;

    setLoading(true);

    try {
      // Старый код оплаты (закомментирован)
      // const { data, error } = await supabase.functions.invoke('create-payment', {
      //   body: { amount: 500, currency: 'RUB' },
      // });
    } catch (e: any) {
      toast.error('Ошибка создания платежа');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-lg mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-neon-magenta/20 border-2 border-neon-magenta/40 mb-6">
            <Icon name="pro" size={32} className="text-neon-magenta" />
          </div>
          <h1 className="text-2xl font-bold mb-2">PRO подписка</h1>
          <p className="text-text-muted">TradeumDiary PRO · В разработке</p>
        </motion.div>
        <Card padding="lg" className="text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-neon-magenta/10 border border-neon-magenta/30">
            <span className="w-2 h-2 rounded-full bg-neon-magenta animate-pulse" />
            <span className="text-sm font-semibold text-neon-magenta uppercase tracking-wider">
              Скоро открытие
            </span>
          </div>
          <p className="text-text-secondary text-sm">
            Мы работаем над запуском PRO подписки с расширенными функциями для профессиональных
            трейдеров.
          </p>
          <div className="pt-4 border-t border-surface-border">
            <p className="text-sm text-text-muted">Оставьте заявку и узнайте первым о запуске!</p>
          </div>
          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() => toast.error('PRO подписка находится в разработке')}
            disabled
          >
            <Icon name="alert" size={16} className="mr-2" />
            Недоступно
          </Button>
        </Card>
      </div>
    </div>
  );
}
