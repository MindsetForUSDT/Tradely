// ============================================================
// TradeumDiary — FAQ секция с аккордеоном
// Плавное раскрытие ответов на частые вопросы
// ============================================================

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { cn } from '@/lib/utils';

const faqs = [
  {
    question: 'Какие блокчейны поддерживаются?',
    answer: 'На данный момент поддерживаются Ethereum, Solana, Polygon, BSC, Arbitrum и Optimism. Мы постоянно добавляем новые сети.',
  },
  {
    question: 'Нужно ли предоставлять приватный ключ?',
    answer: 'Нет! Мы используем только публичный адрес кошелька для чтения истории транзакций. Приватные ключи никогда не запрашиваются и не хранятся.',
  },
  {
    question: 'Как часто обновляются данные?',
    answer: 'Импорт новых кошельков запускается в течение 5 минут после добавления. Данные по существующим кошелькам обновляются каждый час.',
  },
  {
    question: 'Можно ли отменить подписку?',
    answer: 'Да, вы можете отменить подписку в любой момент. Доступ к PRO-функциям сохранится до конца оплаченного периода.',
  },
  {
    question: 'Как рассчитывается P&L?',
    answer: 'P&L рассчитывается на основе разницы между стоимостью токенов на входе и выходе в USD по курсу на момент сделки. Для более точного расчёта используются данные о ценах из публичных API.',
  },
  {
    question: 'Безопасны ли мои данные?',
    answer: 'Абсолютно. Все адреса кошельков шифруются на уровне приложения. Мы используем Row Level Security в Supabase, что гарантирует доступ к данным только их владельцу.',
  },
];

function FAQItem({ question, answer, index }: { question: string; answer: string; index: number }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-surface-border/30 last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full py-5 text-left group"
        aria-expanded={isOpen}
      >
        <span className="text-sm md:text-base font-medium pr-4 group-hover:text-accent-green transition-colors">
          {question}
        </span>
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className={cn(
            'shrink-0 text-text-muted transition-transform duration-300',
            isOpen && 'rotate-45'
          )}
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <p className="text-sm text-text-muted pb-5 leading-relaxed">
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function FAQSection() {
  const { ref, isVisible } = useScrollAnimation<HTMLDivElement>();

  return (
    <section id="faq" ref={ref} className="py-20 md:py-32 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
            Часто задаваемые <span className="text-gradient">вопросы</span>
          </h2>
        </div>

        <div
          className={`
            glass-card p-1 rounded-2xl
            scroll-reveal ${isVisible ? 'visible' : ''}
          `}
        >
          <div className="bg-surface/90 rounded-xl p-4 md:p-6">
            {faqs.map((faq, index) => (
              <FAQItem key={index} question={faq.question} answer={faq.answer} index={index} />
            ))}
          </div>
        </div>

        {/* Контактная информация */}
        <p className="text-center text-sm text-text-muted mt-8">
          Не нашли ответ? Напишите нам:{' '}
          <a href="mailto:info@tradeumdiary.ru" className="text-accent-green hover:text-accent-green-dim transition-colors">
            info@tradeumdiary.ru
          </a>
        </p>
      </div>
    </section>
  );
}