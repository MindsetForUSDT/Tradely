import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import toast from 'react-hot-toast';

export function Payment() {
  const handlePayment = async () => {
    toast.error('Платёжная система временно недоступна.');
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-lg mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">Оплата PRO-подписки</h1>
          <p className="text-text-muted">TradeumDiary PRO · 500 ₽ / месяц</p>
        </motion.div>
        <Card padding="lg" className="text-center space-y-6">
          <p className="text-text-secondary text-sm">Платёжная система находится в разработке.</p>
          <div className="flex items-center justify-between pt-4 border-t border-surface-border">
            <span className="text-sm text-text-secondary">Стоимость:</span>
            <span className="text-lg font-bold">500 ₽ / месяц</span>
          </div>
          <Button variant="primary" size="lg" className="w-full" onClick={handlePayment}>Оплатить 500 ₽</Button>
        </Card>
      </div>
    </div>
  );
}