// ============================================================
// TradeumDiary — Страница оплаты PRO-подписки
// Имитация платёжного шлюза с интеграцией YooKassa
// ============================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

// Типы для формы оплаты
type PaymentMethod = 'card' | 'sbp' | 'crypto';

export function Payment() {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCVC, setCardCVC] = useState('');
  const [cardHolder, setCardHolder] = useState('');

  // Форматирование номера карты (группы по 4 цифры)
  const formatCardNumber = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 16);
    const groups = digits.match(/.{1,4}/g);
    return groups ? groups.join(' ') : digits;
  };

  // Форматирование срока действия (MM/YY)
  const formatExpiry = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    if (digits.length > 2) {
      return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    }
    return digits;
  };

  const handlePayment = async () => {
    // Базовая валидация
    if (paymentMethod === 'card') {
      if (cardNumber.replace(/\s/g, '').length < 16) {
        toast.error('Введите корректный номер карты');
        return;
      }
      if (cardExpiry.length < 5) {
        toast.error('Введите срок действия карты');
        return;
      }
      if (cardCVC.length < 3) {
        toast.error('Введите CVC-код');
        return;
      }
    }

    setIsProcessing(true);

    try {
      // В реальном проекте здесь:
      // 1. Создание платежа через YooKassa API (через Edge Function)
      // 2. Перенаправление на 3D-Secure если требуется
      // 3. Обработка результата через вебхук

      // Имитация обработки платежа
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Имитация успешного платежа
      toast.success('Оплата прошла успешно! Добро пожаловать в PRO.');
      await refreshProfile();
      navigate('/dashboard');
    } catch {
      toast.error('Ошибка оплаты. Попробуйте другую карту.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-lg mx-auto">
        {/* Заголовок */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="w-12 h-12 rounded-xl bg-accent-green/10 border border-accent-green/20 flex items-center justify-center mx-auto mb-4">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent-green">
              <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2">Оплата PRO-подписки</h1>
          <p className="text-text-muted">
            TradeumDiary PRO • 500 ₽ / месяц
          </p>
        </motion.div>

        {/* Выбор метода оплаты */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <div className="grid grid-cols-3 gap-2">
            {([
              { id: 'card' as PaymentMethod, label: 'Карта', icon: '💳' },
              { id: 'sbp' as PaymentMethod, label: 'СБП', icon: '📱' },
              { id: 'crypto' as PaymentMethod, label: 'Крипто', icon: '₿' },
            ]).map((method) => (
              <button
                key={method.id}
                onClick={() => setPaymentMethod(method.id)}
                className={`
                  flex flex-col items-center gap-1.5 p-3 rounded-xl border text-sm transition-all duration-200
                  ${
                    paymentMethod === method.id
                      ? 'border-accent-green bg-accent-green/5 text-accent-green'
                      : 'border-surface-border text-text-muted hover:border-surface-border/70'
                  }
                `}
              >
                <span className="text-lg">{method.icon}</span>
                <span className="text-xs font-medium">{method.label}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Форма оплаты картой */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card padding="lg" className="space-y-5">
            {paymentMethod === 'card' && (
              <>
                {/* Номер карты */}
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">
                    Номер карты
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                      placeholder="0000 0000 0000 0000"
                      maxLength={19}
                      className="w-full px-4 py-2.5 bg-surface-elevated border border-surface-border rounded-xl text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-green/30 focus:border-accent-green/50 transition-colors"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
                      <span className="text-xs opacity-50">💳</span>
                    </div>
                  </div>
                </div>

                {/* Срок и CVC */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1.5">
                      Срок действия
                    </label>
                    <input
                      type="text"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                      placeholder="MM/YY"
                      maxLength={5}
                      className="w-full px-4 py-2.5 bg-surface-elevated border border-surface-border rounded-xl text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-green/30 focus:border-accent-green/50 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1.5">
                      CVC
                    </label>
                    <input
                      type="text"
                      value={cardCVC}
                      onChange={(e) => setCardCVC(e.target.value.replace(/\D/g, '').slice(0, 3))}
                      placeholder="•••"
                      maxLength={3}
                      className="w-full px-4 py-2.5 bg-surface-elevated border border-surface-border rounded-xl text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-green/30 focus:border-accent-green/50 transition-colors"
                    />
                  </div>
                </div>

                {/* Держатель карты */}
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">
                    Держатель карты
                  </label>
                  <input
                    type="text"
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                    placeholder="IVAN IVANOV"
                    className="w-full px-4 py-2.5 bg-surface-elevated border border-surface-border rounded-xl text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-green/30 focus:border-accent-green/50 transition-colors uppercase"
                  />
                </div>
              </>
            )}

            {paymentMethod === 'sbp' && (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-accent-green/10 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📱</span>
                </div>
                <p className="text-sm text-text-secondary mb-2">
                  После нажатия «Оплатить» вы будете перенаправлены в приложение вашего банка
                </p>
                <p className="text-xs text-text-muted">
                  Поддерживаются все банки РФ
                </p>
              </div>
            )}

            {paymentMethod === 'crypto' && (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-accent-green/10 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">₿</span>
                </div>
                <p className="text-sm text-text-secondary mb-2">
                  Оплата через криптовалютный шлюз
                </p>
                <p className="text-xs text-text-muted">
                  USDT (TRC20), BTC, ETH
                </p>
              </div>
            )}

            {/* Итого */}
            <div className="flex items-center justify-between pt-4 border-t border-surface-border">
              <span className="text-sm text-text-secondary">Итого к оплате:</span>
              <span className="text-lg font-bold">500 ₽</span>
            </div>

            {/* Кнопка оплаты */}
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              isLoading={isProcessing}
              onClick={handlePayment}
            >
              Оплатить 500 ₽
            </Button>

            {/* Безопасность */}
            <div className="flex items-center justify-center gap-2 text-xs text-text-muted">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              <span>Защищено шифрованием TLS 1.3</span>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}