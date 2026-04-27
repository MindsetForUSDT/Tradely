import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { cn } from '@/lib/utils';

const faqs = [
  { question: 'Какие блокчейны поддерживаются?', answer: 'Ethereum, Solana, Polygon, BSC, Arbitrum и Optimism.' },
  { question: 'Нужно ли предоставлять приватный ключ?', answer: 'Нет! Только публичный адрес для чтения истории.' },
  { question: 'Как часто обновляются данные?', answer: 'Новые кошельки импортируются в течение 5 минут. Существующие — каждый час.' },
  { question: 'Можно ли отменить подписку?', answer: 'Да, в любой момент. Доступ сохранится до конца оплаченного периода.' },
  { question: 'Как рассчитывается P&L?', answer: 'По разнице стоимости токенов на входе и выходе в USD по курсу на момент сделки.' },
  { question: 'Безопасны ли мои данные?', answer: 'Все адреса шифруются. RLS гарантирует доступ только владельцу.' },
];

function FAQItem({ question, answer }: { question: string; answer: string; index?: number }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-surface-border/30 last:border-0">
      <button onClick={() => setIsOpen(!isOpen)} className="flex items-center justify-between w-full py-5 text-left group" aria-expanded={isOpen}>
        <span className="text-sm md:text-base font-medium pr-4 group-hover:text-accent-green transition-colors">{question}</span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={cn('shrink-0 text-text-muted transition-transform duration-300', isOpen && 'rotate-45')}>
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
            <p className="text-sm text-text-muted pb-5 leading-relaxed">{answer}</p>
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
        <div className="text-center mb-12"><h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">Часто задаваемые <span className="text-gradient">вопросы</span></h2></div>
        <div className={`glass-card p-1 rounded-2xl scroll-reveal ${isVisible ? 'visible' : ''}`}>
          <div className="bg-surface/90 rounded-xl p-4 md:p-6">
            {faqs.map((faq, i) => (<FAQItem key={i} question={faq.question} answer={faq.answer} />))}
          </div>
        </div>
        <p className="text-center text-sm text-text-muted mt-8">Не нашли ответ? Напишите нам: <a href="mailto:info@tradeumdiary.ru" className="text-accent-green hover:text-accent-green-dim transition-colors">info@tradeumdiary.ru</a></p>
      </div>
    </section>
  );
}