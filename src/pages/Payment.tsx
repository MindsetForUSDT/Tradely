import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import toast from 'react-hot-toast';

export function Payment() {
  const [isLoading, setIsLoading] = useState(false);

  const handlePayment = async () => {
    toast.error('Платёжная система временно недоступна. Попробуйте позже.');
    // TODO: Интеграция с YooKassa API
    // 1. POST /functions/v1/create-payment → получаем confirmation_url
    // 2. window.location.href = confirmation_url
    // 3. YooKassa вызывает вебхук → обновляет подписку
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-lg mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-accent-green/10 border border-accent-green/20 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">💳</span>
          </div>
          <h1 className="text-2xl font-bold mb-2">Оплата PRO-подписки</h1>
          <p className="text-text-muted">TradeumDiary PRO · 500 ₽ / месяц</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card padding="lg" className="text-center space-y-6">
            <p className="text-text-secondary text-sm">
              Платёжная система находится в разработке.
              После интеграции с YooKassa вы сможете оплатить подписку картой, через СБП или криптовалюту.
            </p>
            <div className="flex items-center justify-between pt-4 border-t border-surface-border">
              <span className="text-sm text-text-secondary">Стоимость:</span>
              <span className="text-lg font-bold">500 ₽ / месяц</span>
            </div>
            <Button variant="primary" size="lg" className="w-full" isLoading={isLoading} onClick={handlePayment}>
              Оплатить 500 ₽
            </Button>
            <p className="text-xs text-text-muted">
              По вопросам: info@tradeumdiary.ru
            </p>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}