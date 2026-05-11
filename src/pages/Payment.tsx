import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

function getErrorMessage(err: any): string {
  const msg = err?.message || String(err);
  if (
    msg.includes('Failed to fetch') ||
    msg.includes('NetworkError') ||
    msg.includes('Edge Function')
  ) {
    return 'Ошибка соединения с платёжным сервисом. Попробуйте позже.';
  }
  return msg;
}

export function Payment() {
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: { amount: 500, currency: 'RUB' },
      });

      if (error) {
        toast.error(getErrorMessage(error));
        setLoading(false);
        return;
      }

      if (data?.confirmation_url) {
        window.location.href = data.confirmation_url;
      } else {
        toast.error(data?.error || 'Ошибка создания платежа');
      }
    } catch (e: any) {
      toast.error(getErrorMessage(e));
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
          <h1 className="text-2xl font-bold mb-2">Оплата PRO-подписки</h1>
          <p className="text-text-muted">TradeumDiary PRO · 500 ₽ / месяц</p>
        </motion.div>
        <Card padding="lg" className="text-center space-y-6">
          <p className="text-text-secondary text-sm">Оплата через YooKassa. Безопасный платёж.</p>
          <div className="flex items-center justify-between pt-4 border-t border-surface-border">
            <span className="text-sm text-text-secondary">Стоимость:</span>
            <span className="text-lg font-bold">500 ₽ / месяц</span>
          </div>
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={handlePayment}
            isLoading={loading}
          >
            Оплатить 500 ₽
          </Button>
        </Card>
      </div>
    </div>
  );
}
